import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Transaction } from './transaction.entity';

export type LedgerDirection = 'debit' | 'credit';

@Entity()
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Wallet, (w) => w.ledgerEntries, { onDelete: 'CASCADE' })
  wallet!: Wallet;

  @ManyToOne(() => Transaction, (t) => t.ledgerEntries, { onDelete: 'CASCADE' })
  transaction!: Transaction;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'text' })
  direction!: LedgerDirection;
}


