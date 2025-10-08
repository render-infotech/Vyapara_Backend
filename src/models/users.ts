import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

// Define the attributes for the User model
interface UserAttributes {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  profile_pic?: string;
  email: string;
  password: string;
  phone_country_code?: string;
  phone_code?: string;
  phone?: string;
  role_id: number; // 1 = Admin, 2 = Vendor, 3 = Rider, 10 = End User (default)
  status: number;
  is_deactivated: number;
  user_verified?: number;
  password_change_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Optional attributes for creation
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

// Define the User model extending Sequelize Model and implementing UserAttributes
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;

  public first_name!: string;

  public middle_name?: string;

  public last_name?: string;

  public profile_pic?: string;

  public email!: string;

  public password!: string;

  public phone_country_code?: string;

  public phone_code?: string;

  public phone?: string;

  public role_id!: number;

  public status!: number;

  public is_deactivated!: number;

  public user_verified!: number;

  public password_change_date!: Date;

  public created_at!: Date;

  public updated_at!: Date;

  // // Define any additional static methods for the model
  // public static associate(models: any) {}
}

// Initialize the User model
const UserModel = (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID of the users',
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'The first name of the user',
      },
      middle_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The middle name of the user',
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The last name of the user',
      },
      profile_pic: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'The profile pic URL',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Email ID of the user',
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Password of the user',
      },
      phone_country_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'The phone country code (IN, US, etc)',
        defaultValue: null,
      },
      phone_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'The phone code of the phone country',
        defaultValue: null,
      },
      phone: {
        type: DataTypes.STRING(15),
        allowNull: true,
        comment: 'The phone number of the user',
        defaultValue: null,
      },
      role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 10, // Default: End User
        comment: 'Role ID (1=Admin, 2=Vendor, 3=Rider, 10=End User, etc)',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Is the user Active or Not',
      },
      is_deactivated: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'To mark if user is deactivated',
      },
      user_verified: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
        comment: 'Has the user KYC verified',
      },
      password_change_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'Date and time, when the password was last changed',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        comment: 'Date and time, when the records were created',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        onUpdate: DataTypes.NOW as any,
        comment: 'Date and time, when the records were updated',
      },
    },
    {
      sequelize,
      freezeTableName: true,
      tableName: 'users',
      comment: 'Users list table',
      timestamps: false,
    },
  );

  return User;
};

export default UserModel;
