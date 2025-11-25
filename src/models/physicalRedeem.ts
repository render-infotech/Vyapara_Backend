import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import crypto from 'crypto';
import Users from './users';
import CustomerDetails from './customerDetails';
import CustomerAddress from './customerAddress';
import VendorDetails from './vendorDetails';

// Define attributes for the PhysicalRedeem model
interface PhysicalRedeemAttributes {
  id: number;
  customer_id: number;
  redeem_code: string;
  transaction_type_id: number; // 1 = Buy, 2 = Deposit, 3 = Redeem
  material_id: number; // 1 = Gold, 2 = Silver
  price_per_gram: number;
  grams_before_redeem: number;
  grams_redeemed: number;
  grams_after_redeem: number;
  address_id: number;
  products: { product_id: number; quantity: number }[];
  admin_status: number; // 0 = Pending, 1 = Approve, 3 = Reject
  vendor_id?: number;
  vendor_status?: number; // 0 = Pending, 1 = Approve, 3 = Reject
  rider_id?: number;
  rider_status?: number; // 0 = Pending, 1 = Approve, 3 = Reject
  flow_status: number; // 1 = Requested, 2 = Admin Approved,  3 = Admin Rejected, 4 = Vendor Assigned, 5 = Rider Assigned, 6 = Out for Delivery, 7 = Delivered, 8 = Cancelled

  remarks?: string;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface PhysicalRedeemCreationAttributes extends Optional<PhysicalRedeemAttributes, 'id'> { }

// Define the PhysicalRedeem model
class PhysicalRedeem
  extends Model<PhysicalRedeemAttributes, PhysicalRedeemCreationAttributes>
  implements PhysicalRedeemAttributes {
  public id!: number;

  public customer_id!: number;

  public redeem_code!: string;

  public transaction_type_id!: number;

  public material_id!: number;

  public price_per_gram!: number;

  public grams_before_redeem!: number;

  public grams_redeemed!: number;

  public grams_after_redeem!: number;

  public address_id!: number;

  public products!: { product_id: number; quantity: number }[];

  public admin_status!: number;

  public vendor_id?: number;

  public vendor_status?: number;

  public rider_id?: number;

  public rider_status?: number;

  public flow_status!: number;

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
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    customerDetails: Association<CustomerDetails, InstanceType<typeof CustomerDetails>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    customerAddress: Association<CustomerAddress, InstanceType<typeof CustomerAddress>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    vendorDetails: Association<VendorDetails, InstanceType<typeof VendorDetails>>;
  };

  /**
   * A method to associate with other models
   * @static
   * @param {any} models - The models to associate with
   */
  public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('Users')) {
      this.belongsTo(models.Users, {
        foreignKey: 'customer_id',
        targetKey: 'id',
        as: 'user',
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
    if (models.hasOwnProperty('CustomerAddress')) {
      this.belongsTo(models.CustomerAddress, {
        foreignKey: 'address_id',
        targetKey: 'id',
        as: 'customerAddress',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('VendorDetails')) {
      this.belongsTo(models.VendorDetails, {
        foreignKey: 'vendor_id',
        targetKey: 'vendor_id',
        as: 'vendorDetails',
      });
    }
  }
}

// Initialize model
const PhysicalRedeemModel = (sequelize: Sequelize) => {
  PhysicalRedeem.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary key ID of the redeem',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Foreign key of the customer who made the purchase',
      },
      redeem_code: {
        type: DataTypes.STRING(100),
        unique: true,
        comment: 'Unique redeem identifier (e.g., RD20251013-001)',
      },
      transaction_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Transaction type (1 = Buy, 2 = Deposit, 3 = Redeem)',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type (1 = Gold, 2 = Silver)',
      },
      price_per_gram: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Metal price per gram at redeem time was initiated',
      },
      grams_before_redeem: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Total grams the user had before redeem request',
      },
      grams_redeemed: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Grams redeemed in this request',
      },
      grams_after_redeem: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Remaining grams in user digital holdings after redeem',
      },
      address_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Delivery address selected by customer',
      },
      products: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of products with their quantity: [{ product_id, quantity }]',
      },
      admin_status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 = pending, 2 = approved, 3 = rejected
        comment: 'Admin status: 0=Pending, 1=Approve, 2=Reject',
      },
      vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Vendor assigned by admin for processing',
      },
      vendor_status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0, // 0 = not assigned, 1 = accepted, 2 = rejected
        comment: 'Vendor response: 0=Pending, 1=Approve, 2=Reject',
      },
      rider_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Rider assigned by vendor for delivery',
      },
      rider_status: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Rider delivery status: 0=Pending, 1=Approve, 2=Reject',
      },
      flow_status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: `Workflow state:
          1 = Requested
          2 = Admin Approved
          3 = Admin Rejected
          4 = Vendor Assigned
          5 = Rider Assigned
          6 = Out for Delivery
          7 = Delivered
          8 = Cancelled
        `,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional remarks by admin/vendor/rider',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW as any,
        comment: 'Record last update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'physical_redeem',
      timestamps: false,
      modelName: 'physicalRedeem',
      comment: 'Physical gold/silver redeem records table',

      hooks: {
        beforeValidate(record: any) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const random = crypto.randomBytes(3).toString('hex').toUpperCase();
          record.redeem_code = `RD${datePart}-${random}`;
        },
      },
    },
  );

  return PhysicalRedeem;
};

export default PhysicalRedeemModel;
