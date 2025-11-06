import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface MaterialRateAttributes {
  id: number;
  material_id: number; // 1 = Gold, 2 = Silver
  price_per_gram: number; // Price per gram based on market rate
  change_percentage?: number; // Price change percentage based on last stored rate
  is_latest: boolean; // To mark only one latest entry per material_id
  status: number;
  remarks?: string; // Optional notes by admin
  created_at: Date;
  updated_at: Date;
}

interface MaterialRateCreationAttributes extends Optional<MaterialRateAttributes, 'id'> {}

class MaterialRate
  extends Model<MaterialRateAttributes, MaterialRateCreationAttributes>
  implements MaterialRateAttributes
{
  public id!: number;

  public material_id!: number;

  public price_per_gram!: number;

  public change_percentage?: number;

  public is_latest!: boolean;

  public status!: number;

  public remarks?: string;

  public created_at!: Date;

  public updated_at!: Date;
}

export default (sequelize: Sequelize): typeof MaterialRate => {
  MaterialRate.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key ID of the metal rate',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type (1 = Gold, 2 = Silver)',
      },
      price_per_gram: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Metal price per gram',
      },
      change_percentage: {
        type: DataTypes.DECIMAL(6, 2),
        defaultValue: 0.0,
        comment: 'Percentage change compared to previous latest price',
      },
      is_latest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag to mark latest entry per material_id',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Is the rate Active or Not',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin remarks or notes about the price update',
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
        onUpdate: DataTypes.NOW as any,
        comment: 'Record last update timestamp',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'material_rate',
      timestamps: false,
      modelName: 'materrialRate',
    },
  );
  return MaterialRate;
};
