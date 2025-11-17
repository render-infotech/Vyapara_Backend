import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface ProductAttributes {
  id: number;
  material_id: number; // 1 = Gold, 2 = Silver
  product_name: string;
  weight_in_grams: number;
  purity: string; // default 24K
  icon?: string | null; // TEXT
  making_charges?: number;
  description?: string | null;
  status: number; // 1 = Active, 0 = Inactive
  created_at: Date;
  updated_at: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;

  public material_id!: number;

  public product_name!: string;

  public weight_in_grams!: number;

  public purity!: string;

  public icon?: string | null;

  public making_charges?: number;

  public description?: string | null;

  public status!: number;

  public created_at!: Date;

  public updated_at!: Date;
}

const ProductModel = (sequelize: Sequelize): typeof Product => {
  Product.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 = Gold, 2 = Silver',
      },
      product_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      weight_in_grams: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
      },
      purity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '24K',
        comment: '24K, 999, 916',
      },
      icon: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'The product icon URL',
      },
      making_charges: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '1 = Active, 0 = Inactive',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'products',
      timestamps: false,
      comment: 'Products list table',
    },
  );

  return Product;
};

export default ProductModel;
