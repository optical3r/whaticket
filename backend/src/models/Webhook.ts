import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  DataType,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";

@Table
class Webhook extends Model<Webhook> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.STRING(2048))
  url: string;

  @AllowNull(false)
  @Column
  secret: string;

  // Stored as JSON text so it works the same on MySQL and MariaDB.
  @AllowNull(false)
  @Column(DataType.TEXT)
  get events(): string[] {
    const raw = this.getDataValue("events") as unknown as string;
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  set events(value: string[]) {
    this.setDataValue("events", JSON.stringify(value || []) as never);
  }

  @Default(true)
  @Column
  active: boolean;

  @Column
  lastStatus: number;

  @Column(DataType.TEXT)
  lastError: string;

  @Column
  lastSentAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Webhook;
