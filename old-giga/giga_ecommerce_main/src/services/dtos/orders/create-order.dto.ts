import { IsString, IsNumber, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
    productId!: string;

  @IsNumber()
    quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
    customerId!: string;

  @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];
}