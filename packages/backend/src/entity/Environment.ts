import { BaseEntity } from './BaseEntity';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Field, Int, ObjectType } from 'type-graphql';
import { Network } from './Network';
import { Lazy } from '../types';

@ObjectType()
@Entity()
export class Environment extends BaseEntity {
    @Field(() => Int)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    name!: string;

    @OneToMany(
        () => Network,
        network => network.environment,
        { lazy: true },
    )
    networks!: Lazy<Network[]>;

    @Field()
    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Field()
    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
