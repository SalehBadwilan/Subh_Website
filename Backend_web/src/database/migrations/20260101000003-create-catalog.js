'use strict';

/** Migration: catalog (categories, products, images, packages, package_items, merchant_products). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = () => ({
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    const paranoidTs = () => ({ ...ts(), deleted_at: { type: Sequelize.DATE, allowNull: true } });

    // --- categories ---------------------------------------------------------
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: 'uq_categories_slug' },
      name_ar: { type: Sequelize.STRING(100), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...ts(),
    });

    // --- products -----------------------------------------------------------
    await queryInterface.createTable(
      'products',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        category_id: { type: Sequelize.UUID, allowNull: true },
        sku: { type: Sequelize.STRING(50), allowNull: false, unique: 'uq_products_sku' },
        slug: { type: Sequelize.STRING(150), allowNull: false, unique: 'uq_products_slug' },
        name_ar: { type: Sequelize.STRING(200), allowNull: false },
        description_ar: { type: Sequelize.TEXT, allowNull: true },
        price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        vat_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.15 },
        status: {
          type: Sequelize.ENUM('draft', 'active', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
        },
        weight_grams: { type: Sequelize.INTEGER, allowNull: true },
        is_package: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ...paranoidTs(),
      },
      { paranoid: true },
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT chk_products_price CHECK (price_sar >= 0);' +
        'ALTER TABLE products ADD CONSTRAINT chk_products_vat CHECK (vat_rate >= 0 AND vat_rate <= 1);',
    );

    // --- product_images -----------------------------------------------------
    await queryInterface.createTable('product_images', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      product_id: { type: Sequelize.UUID, allowNull: false },
      url: { type: Sequelize.STRING(1024), allowNull: false },
      alt_text_ar: { type: Sequelize.STRING(200), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...ts(),
    });

    // --- packages -----------------------------------------------------------
    await queryInterface.createTable(
      'packages',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sku: { type: Sequelize.STRING(50), allowNull: false, unique: 'uq_packages_sku' },
        slug: { type: Sequelize.STRING(150), allowNull: false, unique: 'uq_packages_slug' },
        name_ar: { type: Sequelize.STRING(200), allowNull: false },
        description_ar: { type: Sequelize.TEXT, allowNull: true },
        price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        vat_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.15 },
        status: {
          type: Sequelize.ENUM('draft', 'active', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
        },
        ...paranoidTs(),
      },
      { paranoid: true },
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE packages ADD CONSTRAINT chk_packages_price CHECK (price_sar >= 0);',
    );

    // --- package_items ------------------------------------------------------
    await queryInterface.createTable('package_items', {
      package_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      product_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      ...ts(),
    });

    // --- merchant_products --------------------------------------------------
    await queryInterface.createTable('merchant_products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: { type: Sequelize.UUID, allowNull: false },
      product_id: { type: Sequelize.UUID, allowNull: true },
      package_id: { type: Sequelize.UUID, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts(),
    });
    // Enforce XOR: exactly one of product_id / package_id is set.
    await queryInterface.sequelize.query(
      "ALTER TABLE merchant_products ADD CONSTRAINT chk_merchant_products_sellable " +
        'CHECK ((product_id IS NULL) <> (package_id IS NULL));',
    );

    // --- Indexes ------------------------------------------------------------
    await queryInterface.addIndex('categories', { fields: ['parent_id'], name: 'idx_categories_parent' });
    await queryInterface.addIndex('products', { fields: ['category_id'], name: 'idx_products_category' });
    await queryInterface.addIndex('products', { fields: ['status'], name: 'idx_products_status' });
    await queryInterface.addIndex('product_images', { fields: ['product_id'], name: 'idx_images_product' });
    await queryInterface.addIndex('merchant_products', { fields: ['merchant_id'], name: 'idx_mp_merchant' });
    await queryInterface.addIndex('merchant_products', { fields: ['product_id'], name: 'idx_mp_product' });
    await queryInterface.addIndex('merchant_products', { fields: ['package_id'], name: 'idx_mp_package' });

    // --- Foreign keys -------------------------------------------------------
    await queryInterface.addConstraint('categories', {
      fields: ['parent_id'],
      type: 'foreign key',
      name: 'fk_categories_parent',
      references: { table: 'categories', field: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('products', {
      fields: ['category_id'],
      type: 'foreign key',
      name: 'fk_products_category',
      references: { table: 'categories', field: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('product_images', {
      fields: ['product_id'],
      type: 'foreign key',
      name: 'fk_images_product',
      references: { table: 'products', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('package_items', {
      fields: ['package_id'],
      type: 'foreign key',
      name: 'fk_package_items_package',
      references: { table: 'packages', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('package_items', {
      fields: ['product_id'],
      type: 'foreign key',
      name: 'fk_package_items_product',
      references: { table: 'products', field: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('merchant_products', {
      fields: ['merchant_id'],
      type: 'foreign key',
      name: 'fk_mp_merchant',
      references: { table: 'merchants', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchant_products', {
      fields: ['product_id'],
      type: 'foreign key',
      name: 'fk_mp_product',
      references: { table: 'products', field: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addConstraint('merchant_products', {
      fields: ['package_id'],
      type: 'foreign key',
      name: 'fk_mp_package',
      references: { table: 'packages', field: 'id' },
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const order = [
      'merchant_products',
      'package_items',
      'packages',
      'product_images',
      'products',
      'categories',
    ];
    for (const t of order) {
      await queryInterface.dropTable(t, { cascade: true });
    }
  },
};
