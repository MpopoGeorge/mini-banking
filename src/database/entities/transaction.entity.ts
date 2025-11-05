import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';

export type TransactionType = 'transfer' | 'exchange';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  type!: TransactionType;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'text' })
  currency!: 'USD' | 'EUR';

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => LedgerEntry, (le) => le.transaction)
  ledgerEntries!: LedgerEntry[];
}


