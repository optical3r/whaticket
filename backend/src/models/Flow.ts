import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";

export type FlowStepType = "message" | "menu" | "question" | "queue" | "close";

export interface FlowOption {
  label: string;
  next: string;
}

// One step of a flow. message and question go on to `next`; menu goes to
// the next step of the chosen option; queue and close end the flow.
export interface FlowStep {
  id: string;
  type: FlowStepType;
  text: string;
  next?: string | null;
  options?: FlowOption[];
  invalidText?: string;
  field?: string;
  queueId?: number | null;
}

export interface FlowDefinition {
  startId: string;
  steps: FlowStep[];
}

// An automated conversation a connection runs for new tickets: menus,
// questions and the transfer to a queue.
@Table
class Flow extends Model<Flow> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  get definition(): FlowDefinition {
    const raw = this.getDataValue("definition") as unknown as string;
    try {
      return raw ? JSON.parse(raw) : { startId: "", steps: [] };
    } catch {
      return { startId: "", steps: [] };
    }
  }

  set definition(value: FlowDefinition) {
    this.setDataValue("definition", JSON.stringify(value) as never);
  }

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Flow;
