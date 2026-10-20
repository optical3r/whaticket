import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AllowNull,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";

// Access token and app secret are stored encrypted; read them through
// helpers/CloudApiCredentials.
@Table
class CloudApiCredential extends Model<CloudApiCredential> {
  @PrimaryKey
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @AllowNull(false)
  @Column
  phoneNumberId: string;

  @AllowNull(false)
  @Column
  wabaId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  accessToken: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  appSecret: string;

  @AllowNull(false)
  @Column
  verifyToken: string;

  @Column(DataType.STRING)
  displayPhoneNumber: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CloudApiCredential;
