import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface ServiceFeeRateAttributes {
  id: number;
  material_id: number; // 1 = Gold, 2 = Silver
  service_fee_type: number; // predefinedServiceFeeFor  (1 = convenience fee, etc)
  service_fee_rate: number; // Rate percentage or value
  effective_date: Date; // Start date for applicability
  status: number; // 1 = Active, 0 = Inactive
  created_at: Date;
  updated_at: Date;
}

interface ServiceFeeRateCreationAttributes extends Optional<ServiceFeeRateAttributes, 'id'> {}

class ServiceFeeRate
  extends Model<ServiceFeeRateAttributes, ServiceFeeRateCreationAttributes>
  implements ServiceFeeRateAttributes
{
  public id!: number;

  public material_id!: number;

  public service_fee_type!: number;

  public service_fee_rate!: number;

  public effective_date!: Date;

  public status!: number;

  public created_at!: Date;

  public updated_at!: Date;
}

export default (sequelize: Sequelize): typeof ServiceFeeRate => {
  ServiceFeeRate.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key ID of the service fee rate',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material reference (1 = Gold, 2 = Silver)',
      },
      service_fee_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Service fee type reference (1 = convenience fee, etc)',
      },
      service_fee_rate: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Service fee rate (percentage or fixed value)',
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Service fee applicable from date',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Status (1 = Active, 0 = Inactive)',
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
      tableName: 'service_fee_rate',
      timestamps: false,
      modelName: 'serviceFeeRate',
    },
  );

  return ServiceFeeRate;
};
