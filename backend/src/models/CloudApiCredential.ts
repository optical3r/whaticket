import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AllowNull,
  Default,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";

// Access token and app secret are stored encrypted; read them through
// helpers/CloudApiCredentials. On Coexy connections the access token is the
// channel token, the ids arrive once the number is connected and there is
// no app secret.
@Table
class CloudApiCredential extends Model<CloudApiCredential> {
  @PrimaryKey
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @AllowNull(false)
  @Default("meta")
  @Column(DataType.STRING)
  provider: "meta" | "coexy";

  @Column(DataType.STRING)
  phoneNumberId: string | null;

  @Column(DataType.STRING)
  wabaId: string | null;

  @AllowNull(false)
  @Column(DataType.TEXT)
  accessToken: string;

  @Column(DataType.TEXT)
  appSecret: string | null;

  @AllowNull(false)
  @Column
  verifyToken: string;

  @Column(DataType.STRING)
  displayPhoneNumber: string | null;

  @Column(DataType.STRING)
  coexyChannelId: string | null;

  @Column(DataType.STRING)
  coexyStatus: string | null;

  @Column(DataType.TEXT)
  connectUrl: string | null;

  @Column(DataType.TEXT)
  verification: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CloudApiCredential;
