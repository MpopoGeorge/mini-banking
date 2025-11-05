import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { LedgerEntry } from './ledger-entry.entity';

export type Currency = 'USD' | 'EUR';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.wallets, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'text' })
  currency!: Currency;

  @Column({ type: 'integer', default: 0 })
  balanceCents!: number;

  @OneToMany(() => LedgerEntry, (le) => le.wallet)
  ledgerEntries!: LedgerEntry[];
}


