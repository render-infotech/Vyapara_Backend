import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import Users from './users';
import DigitalPurchase from './digitalPurchase';
import CustomerDetails from './customerDetails';

// Define attributes for the DigitalHoldings model
interface DigitalHoldingsAttributes {
  id: number;
  customer_id: number;
  material_id: number; // 1 = Gold, 2 = Silver
  purchase_id?: number | null;
  redeem_id?: number | null;
  transaction_type_id: number; // 1 = Buy, 2 = Deposit, 3 = Redeem, 4 = Redeem Refund
  grams: number; // + buy, - redeem
  running_total_grams: number; // balance after this entry
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface DigitalHoldingsCreation extends Optional<DigitalHoldingsAttributes, 'id'> {}

// Define the DigitalHoldings model
class DigitalHoldings
  extends Model<DigitalHoldingsAttributes, DigitalHoldingsCreation>
  implements DigitalHoldingsAttributes
{
  public id!: number;

  public customer_id!: number;

  public material_id!: number;

  public purchase_id!: number | null;

  public redeem_id!: number | null;

  public transaction_type_id!: number;

  public grams!: number;

  public running_total_grams!: number;

  public created_at!: Date;

  public updated_at!: Date;

  /**
   * The type for the association between models
   */
  public static associations: {
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    user: Association<Users, InstanceType<typeof Users>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    digitalPurchase: Association<DigitalPurchase, InstanceType<typeof DigitalPurchase>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    customerDetails: Association<CustomerDetails, InstanceType<typeof CustomerDetails>>;
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
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('DigitalPurchase')) {
      this.belongsTo(models.DigitalPurchase, {
        foreignKey: 'purchase_id',
        targetKey: 'id',
        as: 'digitalPurchase',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('CustomerDetails')) {
      this.belongsTo(models.CustomerDetails, {
        foreignKey: 'customer_id',
        targetKey: 'customer_id',
        as: 'customerDetails',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('PhysicalRedeem')) {
      this.belongsTo(models.PhysicalRedeem, {
        foreignKey: 'redeem_id',
        targetKey: 'id',
        as: 'physicalRedeem',
      });
    }
  }
}

// Initialize model
const DigitalHoldingsModel = (sequelize: Sequelize): typeof DigitalHoldings => {
  DigitalHoldings.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key of the entry',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Customer owning this holding entry',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type (1 = Gold, 2 = Silver)',
      },
      purchase_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Reference to digital purchase (for BUY)',
      },
      redeem_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Reference to physical redeem (for REDEEM)',
      },
      transaction_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
      },
      grams: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Positive for buy, negative for redeem',
      },
      running_total_grams: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Updated balance after this entry',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW as any,
        allowNull: false,
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'digital_holdings',
      timestamps: false,
      modelName: 'digitalHoldings',
      comment: 'Unified data for digital gold/silver holdings',
    },
  );

  return DigitalHoldings;
};

export default DigitalHoldingsModel;
