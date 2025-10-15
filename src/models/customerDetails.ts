import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import Users from './users';

// Define the attributes for the CustomerDetails model
interface CustomerDetailsAttributes {
  id: number;
  customer_id: number;
  customer_code: string;
  nominee_name?: string;
  nominee_phone_country_code?: string;
  nominee_phone_code?: string;
  nominee_phone?: string;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface CustomerDetailsCreationAttributes extends Optional<CustomerDetailsAttributes, 'id' | 'customer_code'> {}

// Define the CustomerDetails model extending Sequelize Model and implementing CustomerDetailsAttributes
class CustomerDetails
  extends Model<CustomerDetailsAttributes, CustomerDetailsCreationAttributes>
  implements CustomerDetailsAttributes
{
  public id!: number;

  public customer_id!: number;

  public customer_code!: string;

  public nominee_name?: string;

  public nominee_phone_country_code?: string;

  public nominee_phone_code?: string;

  public nominee_phone?: string;

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
   */ public static associate(models: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (models.hasOwnProperty('Users')) {
      this.belongsTo(models.Users, {
        foreignKey: 'customer_id',
        as: 'user',
      });
    }
  }
}

// Initialize the CustomerDetails model
const CustomerDetailsModel = (sequelize: Sequelize): typeof CustomerDetails => {
  CustomerDetails.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary ID of the customer details record',
      },
      customer_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Reference to the user this record belongs to',
      },
      customer_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique formatted customer code (e.g., CUS100001)',
      },
      nominee_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Full name of the nominee',
      },
      nominee_phone_country_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'The phone country code of the nominee (IN, US, etc)',
      },
      nominee_phone_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'The phone code of the nominee’s country',
      },
      nominee_phone: {
        type: DataTypes.STRING(15),
        allowNull: true,
        defaultValue: null,
        comment: 'The phone number of the nominee',
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
        comment: 'Record last update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'customer_details',
      timestamps: false,
      modelName: 'customerDetails',
      hooks: {
        beforeValidate: async (record: any) => {
          const lastRecord = await record.constructor.findOne({
            order: [['id', 'DESC']],
          });

          let nextNumber = 100001;
          if (lastRecord && lastRecord?.customer_code) {
            const lastNum = parseInt(lastRecord.customer_code.replace('CUS', ''), 10);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
          }

          record.customer_code = `CUS${nextNumber}`;
        },
      },
    },
  );

  return CustomerDetails;
};

export default CustomerDetailsModel;
