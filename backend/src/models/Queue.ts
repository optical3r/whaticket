import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import { QueueSchedule } from "../helpers/BusinessHours";
import User from "./User";
import UserQueue from "./UserQueue";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  color: string;

  @Column
  greetingMessage: string;

  // Weekly business hours, see helpers/BusinessHours.ts. Stored as JSON text.
  @Column(DataType.TEXT)
  get schedules(): QueueSchedule[] {
    const raw = this.getDataValue("schedules") as unknown as string | null;
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  set schedules(value: QueueSchedule[]) {
    this.setDataValue(
      "schedules",
      (value && value.length ? JSON.stringify(value) : null) as never
    );
  }

  @Column(DataType.TEXT)
  outOfHoursMessage: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;
}

export default Queue;
