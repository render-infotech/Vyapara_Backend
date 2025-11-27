import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import Users from './users';

// Define attributes for RiderDetails model
interface RiderDetailsAttributes {
  id: number;
  rider_id: number;
  vendor_id: number;
  status: number; // 1 = Active, 0 = Inactive
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface RiderDetailsCreationAttributes extends Optional<RiderDetailsAttributes, 'id'> {}

class RiderDetails
  extends Model<RiderDetailsAttributes, RiderDetailsCreationAttributes>
  implements RiderDetailsAttributes
{
  public id!: number;

  public rider_id!: number;

  public vendor_id!: number;

  public status!: number;

  public created_at!: Date;

  public updated_at!: Date;

  /**
   * Associations
   */
  public static associations: {
    // @ts-ignore
    rider: Association<Users, InstanceType<typeof Users>>;
    // @ts-ignore
    vendor: Association<Users, InstanceType<typeof Users>>;
  };

  public static associate(models: any) {
    if (models.hasOwnProperty('Users')) {
      this.belongsTo(models.Users, {
        foreignKey: 'rider_id',
        as: 'rider',
      });
      this.belongsTo(models.Users, {
        foreignKey: 'vendor_id',
        as: 'vendor',
      });
    }
  }
}

const RiderDetailsModel = (sequelize: Sequelize): typeof RiderDetails => {
  RiderDetails.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary ID',
      },
      rider_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'User ID of the rider',
      },
      vendor_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'User ID of the vendor who owns this rider',
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
        comment: 'Creation timestamp',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW as any,
        comment: 'Update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'rider_details',
      timestamps: false,
      modelName: 'riderDetails',
    },
  );

  return RiderDetails;
};

export default RiderDetailsModel;
