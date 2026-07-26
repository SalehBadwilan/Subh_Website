import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  planName: string;
  price: number;

  onSuccess: () => Promise<void>;
};

export default function PaymentDialog({
  open,
  onOpenChange,
  planName,
  price,
  onSuccess,
}: Props) {
    const [cardNumber, setCardNumber] = useState("");
const [cardHolder, setCardHolder] = useState("");
const [expiry, setExpiry] = useState("");
const [cvv, setCvv] = useState("");
const handleCardNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 16);

  const formatted = numbers.replace(/(.{4})/g, "$1 ").trim();

  setCardNumber(formatted);
};

const handleExpiry = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 4);

  if (numbers.length >= 3) {
    setExpiry(`${numbers.slice(0, 2)}/${numbers.slice(2)}`);
  } else {
    setExpiry(numbers);
  }
};

const handleCvv = (value: string) => {
  setCvv(value.replace(/\D/g, "").slice(0, 3));
};

const [loading, setLoading] = useState(false);

const isFormValid =
  cardNumber.replace(/\s/g, "").length === 16 &&
  cardHolder.trim().length > 2 &&
  expiry.length === 5 &&
  cvv.length === 3;

const handlePayment = async () => {
  setLoading(true);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await onSuccess();

  setLoading(false);

toast.success("تمت عملية الدفع بنجاح 🎉");

  onOpenChange(false);
};
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">

        <DialogHeader className="items-center">

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>

          <DialogTitle className="mt-4 text-2xl font-bold">
            إتمام الاشتراك
          </DialogTitle>

          <div className="mt-5 w-full rounded-2xl border p-4">

            <p className="font-bold">
              {planName}
            </p>

            <p className="mt-1 text-primary text-xl font-black">
              {price} ر.س
            </p>

          </div>

        </DialogHeader>

        <div className="space-y-4 mt-5">

          <div>
            <Label>رقم البطاقة</Label>

            <Input
  value={cardNumber}
  onChange={(e) => handleCardNumber(e.target.value)}
  placeholder="1234 5678 9012 3456"
/>
          </div>

          <div>
            <Label>اسم حامل البطاقة</Label>

            <Input
  value={cardHolder}
  onChange={(e) => setCardHolder(e.target.value)}
  placeholder="Saleh Alsharif"
/>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>
              <Label>MM/YY</Label>

              <Input
  value={expiry}
  onChange={(e) => handleExpiry(e.target.value)}
  placeholder="MM/YY"
/>
            </div>

            <div>
              <Label>CVV</Label>

              <Input
  value={cvv}
  onChange={(e) => handleCvv(e.target.value)}
  placeholder="123"
/>
            </div>

          </div>

          <Button
  onClick={handlePayment}
  disabled={!isFormValid || loading}
  className="w-full h-12 rounded-xl text-base font-bold"
>
  {loading ? (
    "جاري معالجة الدفع..."
  ) : (
    "دفع الآن"
  )}
</Button>

        </div>

      </DialogContent>
    </Dialog>
  );
}
