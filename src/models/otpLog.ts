import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import User from './users';

interface OtpLogAttributes {
  id: number;
  user_id: number;
  otp_hash: string;
  expires_at: Date;
  attempts: number;
  is_used: boolean;
  context: string;
  created_at: Date;
}

interface OtpLogCreationAttributes extends Optional<OtpLogAttributes, 'id' | 'attempts' | 'is_used' | 'created_at'> {}

class OtpLog extends Model<OtpLogAttributes, OtpLogCreationAttributes> implements OtpLogAttributes {
  public id!: number;

  public user_id!: number;

  public otp_hash!: string;

  public expires_at!: Date;

  public attempts!: number;

  public is_used!: boolean;

  public context!: string;

  public created_at!: Date;

  public static associate(models: any) {
    if (models.hasOwnProperty('User')) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }
}

const OtpLogModel = (sequelize: Sequelize): typeof OtpLog => {
  OtpLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID of the otp log',
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'User ID',
      },
      otp_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Hashed OTP',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Expiration time of the OTP',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of attempts',
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the OTP has been used',
      },
      context: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Context of the OTP (e.g., physical_redeem)',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Date and time when the record was created',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'otp_logs',
      comment: 'OTP Logs table',
      timestamps: false,
    },
  );

  return OtpLog;
};

export default OtpLogModel;
