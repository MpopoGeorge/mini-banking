import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../database/entities/wallet.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepo: Repository<Wallet>,
  ) {}

  async findUserWallet(userId: string, currency: 'USD' | 'EUR') {
    return this.walletsRepo.findOne({ where: { user: { id: userId }, currency } });
  }

  async getOrCreateUserWallet(userId: string, currency: 'USD' | 'EUR') {
    let wallet = await this.findUserWallet(userId, currency);
    if (!wallet) {
      wallet = this.walletsRepo.create({ user: { id: userId } as any, currency, balanceCents: 0 });
      wallet = await this.walletsRepo.save(wallet);
    }
    return wallet;
  }
}


