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
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import CampaignContact from "./CampaignContact";

// A message sent to many contacts, one at a time, with a random pause
// between sends and only inside the sending window.
// Status: draft -> scheduled -> running -> finished, with paused and
// cancelled along the way.
@Table
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  get tagIds(): number[] {
    const raw = this.getDataValue("tagIds") as unknown as string;
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  set tagIds(value: number[]) {
    this.setDataValue("tagIds", JSON.stringify(value || []) as never);
  }

  @Default("draft")
  @Column
  status: string;

  @Column(DataType.DATE)
  scheduledAt: Date | null;

  @Column(DataType.DATE)
  startedAt: Date | null;

  @Column(DataType.DATE)
  finishedAt: Date | null;

  @Default(20)
  @Column
  minDelaySeconds: number;

  @Default(60)
  @Column
  maxDelaySeconds: number;

  @Default("08:00")
  @Column
  windowStart: string;

  @Default("20:00")
  @Column
  windowEnd: string;

  @Default(true)
  @Column
  includeOptOut: boolean;

  // Official connections send this approved template; `message` keeps its
  // body for the screens.
  @Column(DataType.STRING)
  templateName: string | null;

  @Column(DataType.STRING)
  templateLanguage: string | null;

  @Column(DataType.TEXT)
  get templateParams(): string[] {
    const raw = this.getDataValue("templateParams") as unknown as string;
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  set templateParams(value: string[]) {
    this.setDataValue(
      "templateParams",
      (value && value.length ? JSON.stringify(value) : null) as never
    );
  }

  @Column(DataType.STRING)
  lastError: string | null;

  @Column(DataType.STRING)
  dispatchToken: string | null;

  @ForeignKey(() => Whatsapp)
  @Column(DataType.INTEGER)
  whatsappId: number | null;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @HasMany(() => CampaignContact)
  contacts: CampaignContact[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Campaign;
