import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.auth-guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../database/entities/wallet.entity';
import { LedgerEntry } from '../database/entities/ledger-entry.entity';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(LedgerEntry) private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  @Get('wallets')
  async wallets(@Req() req: any) {
    const userId = req.user.userId;
    const wallets = await this.walletRepo.find({ where: { user: { id: userId } } });
    return wallets.map((w) => ({ id: w.id, currency: w.currency, balanceCents: w.balanceCents }));
  }

  @Get('balances')
  async balances(@Req() req: any) {
    const userId = req.user.userId;
    const wallets = await this.walletRepo.find({ where: { user: { id: userId } } });
    const byCurrency: Record<string, number> = {};
    wallets.forEach((w) => (byCurrency[w.currency] = w.balanceCents));
    return { USD: byCurrency['USD'] ?? 0, EUR: byCurrency['EUR'] ?? 0 };
  }

  @Get('last-transactions')
  async lastTransactions(@Req() req: any, @Query('limit') limit = '5') {
    const userId = req.user.userId;
    const wallets = await this.walletRepo.find({ where: { user: { id: userId } } });
    const walletIds = wallets.map((w) => w.id);
    if (walletIds.length === 0) return [];
    const qb = this.ledgerRepo
      .createQueryBuilder('le')
      .leftJoinAndSelect('le.transaction', 't')
      .where('le.walletId IN (:...ids)', { ids: walletIds })
      .orderBy('t.createdAt', 'DESC')
      .take(parseInt(String(limit), 10) || 5);
    const entries = await qb.getMany();
    // Return unique transactions in order
    const seen = new Set<string>();
    const txs = [] as any[];
    for (const e of entries) {
      const t = (e as any).transaction;
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        txs.push(t);
      }
      if (txs.length >= (parseInt(String(limit), 10) || 5)) break;
    }
    return txs;
  }
}


