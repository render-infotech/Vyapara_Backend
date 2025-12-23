import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import CustomerDetails from './customerDetails';
import CustomerAddress from './customerAddress';
import VendorDetails from './vendorDetails';
import RiderDetails from './riderDetails';
import DigitalPurchase from './digitalPurchase';
import DigitalHolding from './digitalHolding';
import PhysicalRedeem from './physicalRedeem';
import PhysicalDeposit from './physicalDeposit';

// Define the attributes for the User model
interface UserAttributes {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  profile_pic?: string;
  email: string;
  password?: string;
  phone_country_code?: string;
  phone_code?: string;
  phone?: string;
  dob?: string;
  gender?: number; //  1 - Male (default), 2 - Female, 3 - Others
  role_id: number; // 1 = Admin, 2 = Vendor, 3 = Rider, 10 = End User (default)
  status: number;
  two_factor_enabled: boolean;
  is_deactivated: number;
  user_verified?: number;
  is_agreed: number;
  password_change_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// Define the User model extending Sequelize Model and implementing UserAttributes
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;

  public first_name!: string;

  public middle_name?: string;

  public last_name?: string;

  public profile_pic?: string;

  public email!: string;

  public password?: string;

  public phone_country_code?: string;

  public phone_code?: string;

  public phone?: string;

  public dob?: string;

  public gender?: number;

  public role_id!: number;

  public status!: number;

  public two_factor_enabled!: boolean;

  public is_deactivated!: number;

  public user_verified!: number;

  public is_agreed!: number;

  public password_change_date!: Date;

  public created_at!: Date;

  public updated_at!: Date;

  /**
   * The type for the association between models
   */
  public static associations: {
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    customerDetails: Association<CustomerDetails, InstanceType<typeof CustomerDetails>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    customerAddress: Association<CustomerAddress, InstanceType<typeof CustomerAddress>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    vendorDetails: Association<VendorDetails, InstanceType<typeof VendorDetails>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    riderDetails: Association<RiderDetails, InstanceType<typeof RiderDetails>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    digitalPurchase: Association<DigitalPurchase, InstanceType<typeof DigitalPurchase>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    digitalHolding: Association<DigitalHolding, InstanceType<typeof DigitalHolding>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    physicalRedeem: Association<PhysicalRedeem, InstanceType<typeof PhysicalRedeem>>;
    // @ts-ignore
    // eslint-disable-next-line no-use-before-define
    physicalDeposit: Association<PhysicalDeposit, InstanceType<typeof PhysicalDeposit>>;
  };

  /**
   * A method to associate with other models
   * @static
   * @param {any} models - The models to associate with
   */
  public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('CustomerDetails')) {
      this.hasOne(models.CustomerDetails, { foreignKey: 'customer_id', as: 'customerDetails' });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('CustomerAddress')) {
      this.hasMany(models.CustomerAddress, { foreignKey: 'customer_id', as: 'customerAddress' });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('VendorDetails')) {
      this.hasOne(models.VendorDetails, { foreignKey: 'vendor_id', as: 'vendorDetails' });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('RiderDetails')) {
      this.hasOne(models.RiderDetails, { foreignKey: 'rider_id', as: 'riderDetails' });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('DigitalPurchase')) {
      this.hasMany(models.DigitalPurchase, {
        foreignKey: 'customer_id',
        as: 'digitalPurchase',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('DigitalHoldings')) {
      this.hasMany(models.DigitalHoldings, {
        foreignKey: 'customer_id',
        as: 'digitalHoldings',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('PhysicalRedeem')) {
      this.hasMany(models.PhysicalRedeem, {
        foreignKey: 'customer_id',
        as: 'physicalRedeem',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('OtpLog')) {
      this.hasMany(models.OtpLog, {
        foreignKey: 'user_id',
        as: 'otpLogs',
      });
    }
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('PhysicalDeposit')) {
      this.hasMany(models.PhysicalDeposit, {
        foreignKey: 'customer_id',
        as: 'physicalDeposit',
      });
    }
  }
}

// Initialize the User model
const UserModel = (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID of the users',
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'The first name of the user',
      },
      middle_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The middle name of the user',
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The last name of the user',
      },
      profile_pic: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'The profile pic URL',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Email ID of the user',
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Password of the user',
      },
      phone_country_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'The phone country code (IN, US, etc)',
        defaultValue: null,
      },
      phone_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'The phone code of the phone country',
        defaultValue: null,
      },
      phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
        comment: 'The phone number of the user',
      },
      dob: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Date of birth of the user',
      },
      gender: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 1,
        comment: 'Gender of the user (1 = Male, 2 = Female, 3 = Others)',
      },
      role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 10, // Default: End User
        comment: 'Role ID (1=Admin, 2=Vendor, 3=Rider, 10=End User, etc)',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Is the user Active or Not',
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the user has enabled Two-Factor Authentication',
      },
      is_deactivated: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'To mark if user is deactivated',
      },
      user_verified: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
        comment: 'Has the user KYC verified',
      },
      is_agreed: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'User agreement accepted (0 = No, 1 = Yes)',
      },
      password_change_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Date and time, when the password was last changed',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        comment: 'Date and time, when the records were created',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        onUpdate: DataTypes.NOW as any,
        comment: 'Date and time, when the records were updated',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'users',
      comment: 'Users list table',
      timestamps: false,
    },
  );

  return User;
};

export default UserModel;
