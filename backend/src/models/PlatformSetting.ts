import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  DataType
} from "sequelize-typescript";

// A setting of the whole installation, not of one company. Only the
// superadmin changes these.
@Table
class PlatformSetting extends Model<PlatformSetting> {
  @PrimaryKey
  @Column
  key: string;

  @Column(DataType.TEXT)
  value: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PlatformSetting;
