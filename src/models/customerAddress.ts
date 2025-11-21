import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import Users from './users';
import CustomerDetails from './customerDetails';
import PhysicalRedeem from './physicalRedeem';

// Define the attributes for the CustomerAddress model
interface CustomerAddressAttributes {
  id: number;
  customer_id: number;
  full_name: string;
  phone_country_code?: string;
  phone_code?: string;
  phone?: string;
  country: string;
  state: string;
  city: string;
  address_line_1: string;
  address_line_2?: string;
  landmark?: string;
  pincode?: string;
  geo_location?: string;
  address_type?: string; // Home, Work, Other
  is_default: number; // 1 = Yes, 0 = No
  status: number; // 1 = Active, 0 = Inactive
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface CustomerAddressCreationAttributes extends Optional<CustomerAddressAttributes, 'id'> {}

class CustomerAddress
  extends Model<CustomerAddressAttributes, CustomerAddressCreationAttributes>
  implements CustomerAddressAttributes
{
  public id!: number;

  public customer_id!: number;

  public full_name!: string;

  public phone_country_code?: string;

  public phone_code?: string;

  public phone?: string;

  public country!: string;

  public state!: string;

  public city!: string;

  public address_line_1!: string;

  public address_line_2?: string;

  public landmark?: string;

  public pincode?: string;

  public geo_location?: string;

  public address_type?: string;

  public is_default!: number;

  public status!: number;

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
    physicalRedeem: Association<PhysicalRedeem, InstanceType<typeof PhysicalRedeem>>;
  };

  /**
   * A method to associate with other models
   * @static
   * @param {any} models - The models to associate with
   */ public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('Users')) {
      this.belongsTo(models.Users, {
        foreignKey: 'customer_id',
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
    if (models.hasOwnProperty('PhysicalRedeem')) {
      this.hasMany(models.PhysicalRedeem, {
        foreignKey: 'address_id',
        sourceKey: 'id',
        as: 'physicalRedeem',
      });
    }
  }
}

// Initialize the model
const CustomerAddressModel = (sequelize: Sequelize): typeof CustomerAddress => {
  CustomerAddress.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary ID of the address record',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Reference to the customer/user ID',
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Full name of the receiver',
      },
      phone_country_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'Phone country code (IN, US, etc)',
      },
      phone_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'Dialing code (+91, +1, etc)',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: 'Contact number for this address',
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Country name',
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'State or province name',
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'City name',
      },
      address_line_1: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Primary address line',
      },
      address_line_2: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Secondary address line',
      },
      landmark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nearby landmark for easier delivery',
      },
      pincode: {
        type: DataTypes.STRING(15),
        allowNull: true,
        comment: 'Postal or ZIP code',
      },
      geo_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Readable location or map link',
      },
      address_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Home',
        comment: 'Address type (Home, Work, Other)',
      },
      is_default: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Marks this as the default address for the user',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Active (1) or Inactive (0)',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        onUpdate: DataTypes.NOW as any,
        comment: 'Record update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'customer_address',
      comment: 'Customer address table',
      timestamps: false,
    },
  );

  return CustomerAddress;
};

export default CustomerAddressModel;
