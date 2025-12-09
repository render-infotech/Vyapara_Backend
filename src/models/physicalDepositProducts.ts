import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import PhysicalDeposit from './physicalDeposit';

interface PhysicalDepositProductAttributes {
  id: number;
  deposit_id: number;
  product_type: string; // Coin, Bangle, Chain
  material_id: number; // 1=Gold, 2=Silver
  purity: string; // "18K", "22K", "999"
  gross_weight: number;
  net_weight: number;
  pure_metal_equivalent: number;
  created_at: Date;
  updated_at: Date;
}

interface PhysicalDepositProductCreate extends Optional<PhysicalDepositProductAttributes, 'id'> {}

class PhysicalDepositProducts
  extends Model<PhysicalDepositProductAttributes, PhysicalDepositProductCreate>
  implements PhysicalDepositProductAttributes
{
  public id!: number;

  public deposit_id!: number;

  public product_type!: string;

  public material_id!: number;

  public purity!: string;

  public gross_weight!: number;

  public net_weight!: number;

  public pure_metal_equivalent!: number;

  public created_at!: Date;

  public updated_at!: Date;

  /**
   * The type for the association between models
   */
  public static associations: {
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
    if (models.hasOwnProperty('PhysicalDeposit')) {
      this.belongsTo(models.PhysicalDeposit, {
        foreignKey: 'deposit_id',
        as: 'physicalDeposit',
      });
    }
  }
}

const PhysicalDepositProductsModel = (sequelize: Sequelize) => {
  PhysicalDepositProducts.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Primary key ID of each deposited product item',
      },
      deposit_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Reference to main deposits table (foreign key)',
      },
      product_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Type of product (e.g., Ring, Chain, Coin, Bar, Bracelet)',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Material type: 1 = Gold, 2 = Silver (matches material table)',
      },
      purity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Purity of the item (e.g., 22K, 916, 999, 18K, etc.)',
      },
      gross_weight: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Total weight of the product including stones or impurities (in grams)',
      },
      net_weight: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Weight of metal only after deducting stones/wastage (in grams)',
      },
      pure_metal_equivalent: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Final pure metal grams = (net_weight × purity_percentage)',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp when product record was created',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp when product record was last updated',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'physical_deposit_products',
      timestamps: false,
      modelName: 'physicalDepositProducts',
      comment: 'Physical deposit products records table',
    },
  );

  return PhysicalDepositProducts;
};

export default PhysicalDepositProductsModel;
