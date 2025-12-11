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
  customer_id: number;
  vendor_id: number;
  kyc_verified: number; // 0 = not verified, 1 = verified
  vendor_otp_verify: number; // 0 = pending, 1 = verified, 2 = failed
  agreed_by_customer: number; // 0=No, 1=Yes
  agreed_at: Date | null;
  final_summary_otp_verify: number; // 0 = pending, 1 = verified, 2 = failed
  total_pure_grams: number;
  price_per_gram: number;
  estimated_value: number;
  vendor_remarks: string | null;
  flow_status: number; //  Deposit Flow Status: 1=Vendor Verification Pending, 2=Vendor OTP Verified, 3=Agreement Completed, 4=Final Summary OTP Sent, 5=Final Summary OTP Verified, 10=flow Completed,

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

  public customer_id!: number;

  public vendor_id!: number;

  public kyc_verified!: number;

  public vendor_otp_verify!: number;

  public agreed_by_customer!: number;

  public agreed_at!: Date | null;

  public final_summary_otp_verify!: number;

  public total_pure_grams!: number;

  public price_per_gram!: number;

  public estimated_value!: number;

  public vendor_remarks!: string | null;

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
      kyc_verified: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: '1 = KYC Verified, 0 = Not Verified',
      },
      vendor_otp_verify: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'OTP verification for customer, 0 = Pending, 1 = OTP Verified, 2 = Failed',
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
      final_summary_otp_verify: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'OTP verification for summary, 0 = Pending, 1 = OTP Verified, 2 = Failed',
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
      vendor_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Vendor remarks',
      },
      flow_status: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment:
          // eslint-disable-next-line max-len
          'Deposit Flow Status: 1=Vendor Verification Pending, 2=Vendor OTP Verified, 3=Agreement Completed, 4=Final Summary OTP Sent, 5=Final Summary OTP Verified, 10=flow Completed',
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
