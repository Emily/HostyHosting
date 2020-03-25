import { ObjectType, Field, Arg, Mutation, Int, Ctx, Authorized } from 'type-graphql';
import { Application } from '../entity/Application';
import { SecretInput } from './types/Secret';
import { Deployment, DeploymentStrategy } from '../entity/Deployment';
import { ContainerGroup } from '../entity/ContainerGroup';
import { Context } from '../types';
import { OrganizationMembership, OrganizationPermission } from '../entity/OrganizationMembership';
import { OrganizationAccess } from '../utils/permissions';

@ObjectType()
export class ApplicationMutations {
    application: Application;

    constructor(application: Application) {
        this.application = application;
    }

    // TODO: This needs to delete all associated resources. (cascasde should solve this)
    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Application)
    async delete() {
        // TODO: Spin down all resources, and instead of immedietly deleting, mark
        // it in a state of deletion, and don't allow modification to the model.
        await Application.delete(this.application.id);

        return this.application;
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Application)
    async update(
        @Arg('name', { nullable: true }) name?: string,
        @Arg('description', { nullable: true }) description?: string,
        @Arg('secret', { nullable: true }) secret?: SecretInput,
    ) {
        if (typeof name !== 'undefined' && name !== null) {
            this.application.name = name;
        }

        if (typeof description !== 'undefined' && description !== null) {
            this.application.description = description;
        }

        if (typeof secret !== 'undefined' && secret !== null) {
            this.application.secrets = {
                ...this.application.secrets,
                [secret.key]: secret.value,
            };
        }

        return await this.application.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Deployment)
    async createDeployment(
        @Arg('image') image: string,
        @Arg('label') label: string,
        @Arg('strategy', () => DeploymentStrategy) strategy: DeploymentStrategy,
    ) {
        const deployment = new Deployment();
        deployment.application = this.application;
        deployment.label = label;
        deployment.image = image;
        deployment.strategy = strategy;
        return await deployment.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Deployment)
    async updateDeployment(@Arg('id', () => Int) id: number, @Arg('image') image: string) {
        const deployment = await Deployment.findByApplicationAndId(this.application, id);

        deployment.image = image;

        return await deployment.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Deployment)
    async deleteDeployment(@Arg('id', () => Int) id: number) {
        const deployment = await Deployment.findByApplicationAndId(this.application, id);

        const containerGroups = await deployment.containerGroups;
        if (containerGroups.length) {
            throw new Error('You may only delete deployments with no container groups.');
        }

        await Deployment.delete(deployment.id);

        return deployment;
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => ContainerGroup)
    async createContainerGroup(
        @Arg('label') label: string,
        @Arg('deployment', () => Int) deploymentID: number,
        @Arg('size', () => Int) size: number,
        @Arg('number', () => Int) number: number,
    ) {
        const deployment = await Deployment.findByApplicationAndId(this.application, deploymentID);

        const containerGroup = new ContainerGroup();
        containerGroup.application = this.application;
        containerGroup.label = label;
        containerGroup.size = size;
        containerGroup.deployment = deployment;
        containerGroup.containerCount = number;

        return await containerGroup.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => ContainerGroup)
    async updateContainerGroup(
        @Arg('id', () => Int) id: number,
        @Arg('label', { nullable: true }) label?: string,
        @Arg('number', () => Int, { nullable: true }) number?: number,
    ) {
        const containerGroup = await ContainerGroup.findByApplicationAndId(this.application, id);

        if (label) {
            containerGroup.label = label;
        }

        if (number) {
            containerGroup.containerCount = number;
        }

        return await containerGroup.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => ContainerGroup)
    async deleteContainerGroup(@Arg('id', () => Int) id: number) {
        const containerGroup = await ContainerGroup.findByApplicationAndId(this.application, id);

        await ContainerGroup.delete(containerGroup.id);

        return containerGroup;
    }
}

export class ApplicationMutationsResolver {
    @Authorized()
    @Mutation(() => ApplicationMutations)
    async application(@Ctx() { user }: Context, @Arg('id', () => Int) id: number) {
        const application = await Application.findOneOrFail({
            where: {
                id,
            },
        });

        await OrganizationMembership.findOneOrFail({
            where: {
                user,
                organization: await application.organization,
            },
        });

        return new ApplicationMutations(application);
    }
}
