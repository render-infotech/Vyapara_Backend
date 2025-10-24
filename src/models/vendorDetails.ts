import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import Users from './users';

// Define the attributes for the VendorDetails model
interface Material {
  id: number;
  name: string;
}

interface WorkingHour {
  id: number;
  day: string; // mon, tue, wed, etc.
  open: string | null; // e.g., "10:00"
  close: string | null; // e.g., "18:00"
  is_closed: number; // 0 = open, 1 = closed
}

// Define the attributes for the VendorDetails model
interface VendorDetailsAttributes {
  id: number;
  vendor_id: number;
  vendor_code: string;
  business_name?: string;
  address_line?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  is_gst_registered?: number;
  website?: string;
  description?: string;
  materials?: Material[];
  payment_modes?: string[];
  working_hours?: WorkingHour[];
  rating?: number;
  review_count?: number;
  is_complete?: number; // 0 - Pending, 1 - Completed
  created_at?: Date;
  updated_at?: Date;
}

// Optional attributes for creation
interface VendorDetailsCreationAttributes extends Optional<VendorDetailsAttributes, 'id' | 'vendor_code'> {}

// Define the VendorDetails model extending Sequelize Model and implementing VendorDetailsAttributes
class VendorDetails
  extends Model<VendorDetailsAttributes, VendorDetailsCreationAttributes>
  implements VendorDetailsAttributes
{
  public id!: number;

  public vendor_id!: number;

  public vendor_code!: string;

  public business_name?: string;

  public address_line?: string;

  public country!: string;

  public state!: string;

  public city!: string;

  public pincode?: string;

  public gst_number?: string;

  public is_gst_registered?: number;

  public website?: string;

  public description?: string;

  public materials?: Material[];

  public payment_modes?: string[];

  public working_hours?: WorkingHour[];

  public rating?: number;

  public review_count?: number;

  public is_complete?: number;

  public created_at?: Date;

  public updated_at?: Date;

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
   */ public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('Users')) {
      this.belongsTo(models.Users, {
        foreignKey: 'vendor_id',
        as: 'user',
      });
    }
  }
}

// Initialize the VendorDetails model
const VendorDetailsModel = (sequelize: Sequelize): typeof VendorDetails => {
  VendorDetails.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary ID of the vendor details record',
      },
      vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Reference to the user this vendor belongs to',
      },
      vendor_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique code of the vendor, auto-generated',
      },
      business_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Business name of the vendor',
      },
      address_line: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Street address or shop location',
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Country name of the vendor',
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'State name of the vendor',
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'City name of the vendor',
      },
      pincode: {
        type: DataTypes.STRING(15),
        allowNull: true,
        comment: 'Postal/ZIP code of the vendor',
      },
      gst_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'GST number if applicable',
      },
      is_gst_registered: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
        comment: '1 if GST registered, else 0',
      },
      website: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Official website URL of the vendor',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description or about section of the vendor',
      },
      materials: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'List of materials vendor deals in',
      },
      payment_modes: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Accepted payment modes, e.g. ["UPI","Cash","Credit Card"]',
      },
      working_hours: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Vendor working hours',
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Average rating of the vendor',
      },
      review_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Total number of reviews',
      },
      is_complete: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 1,
        comment: 'If the profile steps completed by Admin, so it can be listed for operations',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        comment: 'Date and time when record was created',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW as any,
        comment: 'Date and time when record was last updated',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'vendor_details',
      timestamps: false,
      modelName: 'vendorDetails',
      comment: 'Stores detailed information about vendors',
      hooks: {},
    },
  );

  return VendorDetails;
};

export default VendorDetailsModel;
