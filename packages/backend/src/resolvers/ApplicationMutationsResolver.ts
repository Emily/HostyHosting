import { ObjectType, Field, Arg, Mutation, Int, Ctx, Authorized } from 'type-graphql';
import { Application } from '../entity/Application';
import { Component } from '../entity/Component';
import { Context } from '../types';
import { OrganizationPermission } from '../entity/OrganizationMembership';
import { OrganizationAccess } from '../utils/permissions';
import { ComponentInput } from './types/ComponentInput';
import { ApplicationInput } from './types/ApplicationInput';
import { ContainerGroup, ContainerSize } from '../entity/ContainerGroup';

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
    async update(@Arg('application', () => ApplicationInput) applicationInput: ApplicationInput) {
        if (typeof applicationInput.name !== 'undefined' && applicationInput.name !== null) {
            this.application.name = applicationInput.name;
        }

        if (
            typeof applicationInput.description !== 'undefined' &&
            applicationInput.description !== null
        ) {
            this.application.description = applicationInput.description;
        }

        if (typeof applicationInput.secret !== 'undefined' && applicationInput.secret !== null) {
            this.application.secrets = {
                ...this.application.secrets,
                [applicationInput.secret.key]: applicationInput.secret.value,
            };
        }

        return await this.application.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Component)
    async createComponent(@Arg('component', () => ComponentInput) componentInput: ComponentInput) {
        const containerGroup = new ContainerGroup();
        containerGroup.containerCount = componentInput.containerCount;
        containerGroup.size = componentInput.size;
        await containerGroup.save();

        const component = new Component();
        component.application = this.application;
        component.name = componentInput.name;
        component.image = componentInput.image;
        component.deploymentStrategy = componentInput.deploymentStrategy;
        component.containerGroup = containerGroup;

        return await component.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Component)
    // TODO: I'm leaving this as-is for now and not using an input type because this probably needs a lot of work anyway:
    async updateComponent(@Arg('id', () => Int) id: number, @Arg('image') image: string) {
        const deployment = await Component.findByApplicationAndId(this.application, id);

        deployment.image = image;

        return await deployment.save();
    }

    @OrganizationAccess(
        () => ApplicationMutations,
        applicationMutations => applicationMutations.application.organization,
        OrganizationPermission.WRITE,
    )
    @Field(() => Component)
    async deleteComponent(@Arg('id', () => Int) id: number) {
        const deployment = await Component.findByApplicationAndId(this.application, id);
        await Component.delete(deployment.id);
        return deployment;
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

        // Ensure the current user has permission to this application:
        await application.userHasPermission(user);

        return new ApplicationMutations(application);
    }
}
