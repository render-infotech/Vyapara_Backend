import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface ServiceControlAttributes {
  id: number;
  service_key: number; // 0 = inactive, 1 = active
  is_enabled: number;
  reason: string;
  toggled_by: number;
  created_at: Date;
  updated_at: Date;
}

interface ServiceControlCreationAttributes extends Optional<ServiceControlAttributes, 'id'> {}

class ServiceControl
  extends Model<ServiceControlAttributes, ServiceControlCreationAttributes>
  implements ServiceControlAttributes
{
  public id!: number;

  public service_key!: number; // 0 = inactive, 1 = active

  public is_enabled!: number;

  public reason!: string;

  public toggled_by!: number;

  public created_at!: Date;

  public updated_at!: Date;
}

const ServiceControlModel = (sequelize: Sequelize) => {
  ServiceControl.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary ID of the service control record',
      },
      service_key: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Unique identifier of the service flow (mapped in code)',
      },
      is_enabled: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Service status: 1 = Enabled, 0 = Disabled',
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Reason provided by admin when disabling the service',
      },
      toggled_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Admin user ID who last toggled the service',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Record creation date',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        onUpdate: DataTypes.NOW as any,
        comment: 'Record last update date',
      },
    },
    {
      sequelize,
      tableName: 'service_control',
      timestamps: false,
      comment: 'Stores service control data',
    },
  );

  return ServiceControl;
};

export default ServiceControlModel;
