import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import crypto from 'crypto';
import Users from './users';
import VendorDetails from './vendorDetails';
import CustomerDetails from './customerDetails';
import PhysicalDepositProducts from './physicalDepositProducts';

// Define attributes for the PhysicalRedeem model
interface PhysicalDepositAttributes {
  id: number;
  deposit_code: string;
  material_id: number; // 1=gold,2=silver
  customer_id: number;
  vendor_id: number;
  vendor_check_otp: string | null;
  vendor_check_otp_verified_at: Date | null;
  vendor_check_status: number; // 0 = pending, 1 = verified, 2 = failed
  kyc_verified: number; // 0 = not verified, 1 = verified
  agreed_by_customer: number; // 0=No, 1=Yes
  agreed_at: Date | null;
  summary_otp: string | null;
  summary_otp_verified_at: Date | null;
  total_pure_grams: number;
  price_per_gram: number;
  estimated_value: number;
  admin_status: number; // 0=pending,1=approved,2=rejected
  admin_remarks: string | null;
  flow_status: number; //  1 = Vendor Customer Check Started, 2 = Customer Verified (OTP Step 1 done), //  3 = Product Listing Completed, 4 = Summary OTP Sent, 5 = Summary OTP Verified by Customer, 6 = Admin Approved, 7 = Admin Rejected, 8 = Completed & Holdings Updated,
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface PhysicalDepositCreation extends Optional<PhysicalDepositAttributes, 'id'> {}

// Define the PhysicalDeposit model
class PhysicalDeposit
  extends Model<PhysicalDepositAttributes, PhysicalDepositCreation>
  implements PhysicalDepositAttributes
{
  public id!: number;

  public deposit_code!: string;

  public material_id!: number;

  public customer_id!: number;

  public vendor_id!: number;

  public vendor_check_otp!: string | null;

  public vendor_check_otp_verified_at!: Date | null;

  public vendor_check_status!: number;

  public kyc_verified!: number;

  public agreed_by_customer!: number;

  public agreed_at!: Date | null;

  public summary_otp!: string | null;

  public summary_otp_verified_at!: Date | null;

  public total_pure_grams!: number;

  public price_per_gram!: number;

  public estimated_value!: number;

  public admin_status!: number;

  public admin_remarks!: string | null;

  public flow_status!: number;

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
    vendorDetails: Association<VendorDetails, InstanceType<typeof VendorDetails>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    physicalDepositProducts: Association<PhysicalDepositProducts, InstanceType<typeof PhysicalDepositProducts>>;
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
    if (models.hasOwnProperty('VendorDetails')) {
      this.belongsTo(models.VendorDetails, {
        foreignKey: 'vendor_id',
        targetKey: 'vendor_id',
        as: 'vendorDetails',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('PhysicalDepositProducts')) {
      this.hasMany(models.PhysicalDepositProducts, {
        foreignKey: 'deposit_id',
        as: 'depositProducts',
      });
    }
  }
}

// Initialize model
const PhysicalDepositModel = (sequelize: Sequelize) => {
  PhysicalDeposit.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary key ID of the deposit request',
      },
      deposit_code: {
        type: DataTypes.STRING(50),
        unique: true,
        comment: 'Unique deposit reference code (e.g., DP20251209-ABC123)',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type: 1 = Gold, 2 = Silver',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Customer ID who is giving the deposit to vendor',
      },
      vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Vendor ID who is recording the deposit',
      },
      vendor_check_otp: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'OTP sent to customer for verifying account status by vendor',
      },
      vendor_check_otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when vendor_check OTP was verified',
      },
      vendor_check_status: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '0 = Pending, 1 = OTP Verified, 2 = Failed',
      },
      kyc_verified: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: '1 = KYC Verified, 0 = Not Verified',
      },
      agreed_by_customer: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '0 = Not Agreed Yet, 1 = Both Customer & Vendor Agreed',
      },
      agreed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when customer and vendor reached agreement',
      },
      summary_otp: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'OTP sent to customer email for final deposit summary confirmation',
      },
      summary_otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when summary OTP was verified by vendor',
      },
      total_pure_grams: {
        type: DataTypes.DECIMAL(15, 6),
        defaultValue: 0,
        comment: 'Total pure gold/silver grams after converting each product’s purity',
      },
      price_per_gram: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Live price per gram used for estimated valuation',
      },
      estimated_value: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Total estimated amount customer will receive (pure grams × price_per_gram)',
      },
      admin_status: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '0 = Pending, 1 = Approved, 2 = Rejected',
      },
      admin_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin remarks for approval/rejection',
      },
      flow_status: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: `Deposit flow status:
      1 = Vendor Check Pending
      2 = Vendor Check Approved
      3 = Agreement Done (Both Agreed)
      4 = Summary OTP Sent
      5 = Summary OTP Verified
      6 = Pending Admin Review
      7 = Admin Approved
      8 = Admin Rejected
      9 = Completed (Holdings Updated)
    `,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Record last update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'physical_deposit',
      timestamps: false,
      modelName: 'physicalDeposit',
      comment: 'Physical gold/silver deposit records table',

      hooks: {
        beforeValidate(record: any) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const random = crypto.randomBytes(3).toString('hex').toUpperCase();
          record.deposit_code = `PD${datePart}-${random}`;
        },
      },
    },
  );

  return PhysicalDeposit;
};

export default PhysicalDepositModel;
