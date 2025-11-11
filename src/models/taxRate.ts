import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface TaxRateAttributes {
  id: number;
  material_id: number; // 1 = Gold, 2 = Silver
  tax_type: number; // predefinedTaxType  (1 = GST, etc)
  tax_percentage: number; // Defined tax rate percentage
  tax_on: number; // predefinedTaxFor  (1 = Material, 2 = Service_fee,)
  effective_date: Date; // Tax applicable start date
  status: number; // Active or disabled tax rate
  created_at: Date;
  updated_at: Date;
}

interface TaxRateCreationAttributes extends Optional<TaxRateAttributes, 'id'> {}

class TaxRate extends Model<TaxRateAttributes, TaxRateCreationAttributes> implements TaxRateAttributes {
  public id!: number;

  public material_id!: number;

  public tax_type!: number;

  public tax_percentage!: number;

  public tax_on!: number;

  public effective_date!: Date;

  public status!: number;

  public created_at!: Date;

  public updated_at!: Date;
}

export default (sequelize: Sequelize): typeof TaxRate => {
  TaxRate.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key ID of the tax rate',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material reference (1 = Gold, 2 = Silver)',
      },
      tax_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Tax type reference (1 = GST, etc)',
      },
      tax_percentage: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Applied tax rate percentage',
      },
      tax_on: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'What this tax applies to (1 = Material, 2 = Service_fee)',
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Tax effective start date',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Is the tax rate active? (1 = Active, 0 = Inactive)',
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
      tableName: 'tax_rate',
      timestamps: false,
      modelName: 'taxRate',
    },
  );

  return TaxRate;
};
