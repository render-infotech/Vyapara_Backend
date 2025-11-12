import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import crypto from 'crypto';
import Users from './users';

// Define attributes for the CustomerOnlineTransactions model
interface DigitalPurchaseAttributes {
  id: number;
  customer_id: number;
  transaction_type_id: number; // 1 = Buy, 2 = Deposit, 3 = Redeem
  purchase_code: string;
  material_id: number; // 1 = Gold, 2 = Silver
  amount: number;
  price_per_gram: number;
  grams_purchased: number;
  tax_rate_material?: string; // tax rate % on material
  tax_amount_material?: number; // tax amount on material
  tax_rate_service?: string; // tax rate % on service
  tax_amount_service?: number; // tax amount on material
  total_tax_amount?: number; // e.g. 81
  service_fee_rate?: string; // service rate % value
  service_fee: number; // actual fee amount
  total_amount: number;
  purchase_status: number; // 1 = Pending, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = Refunded
  rate_timestamp?: Date;
  remarks?: string;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface DigitalPurchaseCreationAttributes extends Optional<DigitalPurchaseAttributes, 'id'> {}

// Define the CustomerOnlineTransactions model
class DigitalPurchase
  extends Model<DigitalPurchaseAttributes, DigitalPurchaseCreationAttributes>
  implements DigitalPurchaseAttributes
{
  public id!: number;

  public customer_id!: number;

  public transaction_type_id!: number;

  public purchase_code!: string;

  public material_id!: number;

  public amount!: number;

  public price_per_gram!: number;

  public grams_purchased!: number;

  public tax_rate_material?: string;

  public tax_amount_material?: number;

  public tax_rate_service?: string;

  public tax_amount_service?: number;

  public total_tax_amount?: number;

  public service_fee_rate?: string;

  public service_fee!: number;

  public total_amount!: number;

  public purchase_status!: number;

  public rate_timestamp?: Date;

  public remarks?: string;

  public created_at!: Date;

  public updated_at!: Date;

  /**
   * The type for the association between models
   */
  public static associations: {
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    user: Association<Users, InstanceType<typeof Users>>;
  };

  /**
   * A method to associate with other models
   * @static
   * @param {any} models - The models to associate with
   */
  public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('User')) {
      this.belongsTo(models.User, {
        foreignKey: 'customer_id',
        targetKey: 'id',
        as: 'user',
      });
    }
  }
}

// Initialize model
const DigitalPurchaseModel = (sequelize: Sequelize): typeof DigitalPurchase => {
  DigitalPurchase.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key ID of the purchase',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Foreign key of the customer who made the purchase',
      },
      transaction_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
      },
      purchase_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique purchase identifier (e.g., DP20251013-001)',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type (1 = Gold, 2 = Silver)',
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Base amount entered by customer (excluding taxes)',
      },
      price_per_gram: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Metal price per gram at purchase time',
      },
      grams_purchased: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Grams calculated = amount / price_per_gram',
      },
      tax_rate_material: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Tax rate applied on material (e.g. +5%)',
      },
      tax_amount_material: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Tax amount calculated on material',
      },
      tax_rate_service: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Tax rate applied on service (e.g. +16%)',
      },
      tax_amount_service: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Tax amount calculated on service',
      },
      total_tax_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total combined tax (material + service)',
      },
      service_fee_rate: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '0.0',
        comment: 'Service fee rate (%) as string',
      },
      service_fee: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Service fee amount',
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total amount including tax, commission, and service charge',
      },
      purchase_status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Purchase status (1 = Pending, 2 = Completed, 3 = Failed, 4 = Cancelled, 5 = Refunded)',
      },
      rate_timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Timestamp when the rate was fetched',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional remarks or notes about the transaction',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW as any,
        comment: 'Record last update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'digital_purchase',
      timestamps: false,
      modelName: 'digitalPurchase',
      comment: 'Digital gold/silver purchase records table',
      hooks: {
        beforeValidate(record: any) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
          record.purchase_code = `DP${datePart}-${randomPart}`;
        },
      },
    },
  );

  return DigitalPurchase;
};

export default DigitalPurchaseModel;
