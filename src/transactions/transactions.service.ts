import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction, TransactionType } from '../database/entities/transaction.entity';
import { LedgerEntry } from '../database/entities/ledger-entry.entity';
import { Wallet } from '../database/entities/wallet.entity';

const EXCHANGE_RATE = 0.92; // 1 USD = 0.92 EUR

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(LedgerEntry) private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
  ) {}

  private toCents(amount: number) {
    return Math.round(amount * 100);
  }

  async list(type?: TransactionType, page = 1, limit = 10) {
    const qb = this.txRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    if (type) qb.andWhere('t.type = :type', { type });
    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async transfer(fromWalletId: string, toWalletId: string, amountCents: number) {
    if (amountCents <= 0) throw new BadRequestException('Amount must be positive');
    if (fromWalletId === toWalletId) throw new BadRequestException('Cannot transfer to same wallet');

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const from = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: fromWalletId })
        .getOneOrFail();

      const to = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: toWalletId })
        .getOneOrFail();

      if (from.currency !== to.currency) throw new BadRequestException('Currency mismatch');
      if (from.balanceCents < amountCents) throw new BadRequestException('Insufficient funds');

      const tx = manager.create(Transaction, {
        type: 'transfer',
        amountCents,
        currency: from.currency as any,
      });
      await manager.save(tx);

      from.balanceCents -= amountCents;
      to.balanceCents += amountCents;
      await manager.save([from, to]);

      const debit = manager.create(LedgerEntry, {
        wallet: { id: from.id } as any,
        transaction: { id: tx.id } as any,
        amountCents,
        direction: 'debit',
      });
      const credit = manager.create(LedgerEntry, {
        wallet: { id: to.id } as any,
        transaction: { id: tx.id } as any,
        amountCents,
        direction: 'credit',
      });
      await manager.save([debit, credit]);
      return tx;
    });
  }

  async exchange(userUsdWalletId: string, userEurWalletId: string, fromCurrency: 'USD' | 'EUR', amountCents: number) {
    if (amountCents <= 0) throw new BadRequestException('Amount must be positive');

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const usd = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: userUsdWalletId })
        .getOneOrFail();
      const eur = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: userEurWalletId })
        .getOneOrFail();

      let debitWallet: Wallet;
      let creditWallet: Wallet;
      let creditAmountCents: number;
      if (fromCurrency === 'USD') {
        debitWallet = usd;
        creditWallet = eur;
        const eurAmount = Math.floor(amountCents * EXCHANGE_RATE);
        creditAmountCents = eurAmount;
      } else {
        debitWallet = eur;
        creditWallet = usd;
        const usdAmount = Math.floor(amountCents / EXCHANGE_RATE);
        creditAmountCents = usdAmount;
      }

      if (debitWallet.balanceCents < amountCents) throw new BadRequestException('Insufficient funds');

      const tx = manager.create(Transaction, {
        type: 'exchange',
        amountCents,
        currency: fromCurrency,
      });
      await manager.save(tx);

      debitWallet.balanceCents -= amountCents;
      creditWallet.balanceCents += creditAmountCents;
      await manager.save([debitWallet, creditWallet]);

      const debit = manager.create(LedgerEntry, {
        wallet: { id: debitWallet.id } as any,
        transaction: { id: tx.id } as any,
        amountCents,
        direction: 'debit',
      });
      const credit = manager.create(LedgerEntry, {
        wallet: { id: creditWallet.id } as any,
        transaction: { id: tx.id } as any,
        amountCents: creditAmountCents,
        direction: 'credit',
      });
      await manager.save([debit, credit]);
      return tx;
    });
  }
}


