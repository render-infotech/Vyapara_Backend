import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface ContentPageAttributes {
  id: number;
  page_name: string;
  page_details: string;
  page_type: string;
  status: number; // 0 = inactive, 1 = active
  is_deleted: number; // 0 = not deleted, 1 = deleted
  created_at: Date;
  updated_at: Date;
}

interface ContentPageCreationAttributes extends Optional<ContentPageAttributes, 'id'> {}

class ContentPage extends Model<ContentPageAttributes, ContentPageCreationAttributes> implements ContentPageAttributes {
  public id!: number;

  public page_name!: string;

  public page_details!: string;

  public page_type: string;

  public status!: number; // 0 or 1

  public is_deleted!: number; // 0 or 1

  public created_at!: Date;

  public updated_at!: Date;
}

const ContentPageModel = (sequelize: Sequelize): typeof ContentPage => {
  ContentPage.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID of the page',
      },
      page_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Name of the page',
      },
      page_details: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        comment: 'Page details or content (may contain HTML)',
      },
      page_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Defines which role/app this page belongs to',
      },
      status: {
        type: DataTypes.TINYINT,
        defaultValue: 1, // 1 = active
        allowNull: false,
        comment: 'Status of the page (0 = inactive, 1 = active)',
      },
      is_deleted: {
        type: DataTypes.TINYINT,
        defaultValue: 0, // 0 = not deleted
        allowNull: false,
        comment: 'Soft delete flag (0 = not deleted, 1 = deleted)',
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
      tableName: 'content_pages',
      comment: 'Stores static/dynamic page content',
      timestamps: false,
    },
  );

  return ContentPage;
};

export default ContentPageModel;
