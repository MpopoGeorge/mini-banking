import { Body, Controller, Get, Post, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { TransactionsService } from './transactions.service';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt.auth-guard';

class ListTxQuery {
  @IsOptional()
  @IsIn(['transfer', 'exchange'])
  type?: 'transfer' | 'exchange';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Get()
  list(@Query() q: ListTxQuery) {
    return this.txService.list(q.type, q.page, q.limit);
  }

  private parseAmountToCents(input: string) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(input)) {
      throw new BadRequestException('Amount must have up to 2 decimal places');
    }
    const cents = Math.round(parseFloat(input) * 100);
    return cents;
  }

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  transfer(@Body() body: { fromWalletId: string; toWalletId: string; amount: string }) {
    const amountCents = this.parseAmountToCents(body.amount);
    return this.txService.transfer(body.fromWalletId, body.toWalletId, amountCents);
  }

  @UseGuards(JwtAuthGuard)
  @Post('exchange')
  exchange(@Body() body: { usdWalletId: string; eurWalletId: string; fromCurrency: 'USD' | 'EUR'; amount: string }) {
    const amountCents = this.parseAmountToCents(body.amount);
    return this.txService.exchange(body.usdWalletId, body.eurWalletId, body.fromCurrency, amountCents);
  }
}


