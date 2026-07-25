import { Router } from "express";
import asyncHandler from "../../../utils/asyncHandler.js";
import { body, param } from "express-validator";
import validate from "../../../middleware/validate.js";
import { notFound } from "../../../utils/ApiError.js";

export default function createOperationsSupportRoutes({ models }) {
  const router = Router();

  const { SupportTicket, User, Order } = models;

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const tickets = await SupportTicket.findAll({
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "full_name", "phone"],
          },
          {
            model: Order,
            as: "Order",
            attributes: ["id", "number"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
      });

      res.json({
        ok: true,
        data: tickets,
      });
    }),
  );
  router.patch(
  "/:id/status",
  [
    param("id").isUUID(),
    body("status").isIn([
      "open",
      "in_progress",
      "resolved",
      "closed",
    ]),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const ticket = await SupportTicket.findByPk(req.params.id);

    if (!ticket) {
      throw notFound("Support Ticket");
    }

    ticket.status = req.body.status;
    await ticket.save();

    res.json({
      ok: true,
      data: ticket,
    });
  }),
);

  return router;
}