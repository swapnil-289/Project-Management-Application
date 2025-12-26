import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management-webapplication" });

// --- USER FUNCTIONS ---

const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { data } = event;
        const email = data.email_addresses?.[0]?.email_address || "";
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        // Use upsert to prevent "User already exists" crashes
        await prisma.user.upsert({
            where: { id: data.id },
            update: {
                email: email,
                name: name,
                image: data.image_url,
            },
            create: {
                id: data.id,
                email: email,
                name: name,
                image: data.image_url,
            }
        });
    }
)

const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event;
        const email = data.email_addresses?.[0]?.email_address || "";
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

        await prisma.user.upsert({
            where: { id: data.id },
            update: {
                email: email,
                name: name,
                image: data.image_url,
            },
            create: {
                id: data.id,
                email: email,
                name: name,
                image: data.image_url,
            }
        });
    }
)

const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-from-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event;
        try {
            await prisma.user.delete({ where: { id: data.id } });
        } catch (error) {
            // Ignore if user is already deleted
            if (error.code !== 'P2025') throw error;
        }
    }
)

// --- WORKSPACE FUNCTIONS (These were missing!) ---

const syncWorkspaceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk' },
    { event: 'clerk/organization.created' },
    async ({ event }) => {
        const { data } = event;
        
        await prisma.workspace.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            },
            create: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                ownerId: data.created_by,
                image_url: data.image_url,
            }
        });

        // Ensure creator is admin
        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: data.created_by,
                    workspaceId: data.id,
                }
            },
            update: { role: "ADMIN" },
            create: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        });
    }
)

const syncWorkspaceUpdation = inngest.createFunction(
    { id: 'update-workspace-from-clerk' },
    { event: 'clerk/organization.updated' },
    async ({ event }) => {
        const { data } = event;
        // Only update if it exists
        const count = await prisma.workspace.count({ where: { id: data.id } });
        if (count > 0) {
            await prisma.workspace.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    slug: data.slug,
                    image_url: data.image_url,
                }
            });
        }
    }
)

const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-with-clerk' },
    { event: 'clerk/organization.deleted' },
    async ({ event }) => {
        const { data } = event;
        try {
            await prisma.workspace.delete({ where: { id: data.id } });
        } catch (error) {
            if (error.code !== 'P2025') throw error;
        }
    }
)

const syncWorkspaceMemberCreation = inngest.createFunction(
    { id: 'sync-workspace-member-from-clerk' },
    { event: 'clerk/organizationInvitation.accepted' },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: data.public_user_data.user_id, // Access user_id correctly
                    workspaceId: data.organization_id,
                }
            },
            update: { role: String(data.role || "MEMBER").toUpperCase().includes("ADMIN") ? "ADMIN" : "MEMBER" },
            create: {
                userId: data.public_user_data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role || "MEMBER").toUpperCase().includes("ADMIN") ? "ADMIN" : "MEMBER",
            }
        });
    }
)

// --- TASK FUNCTIONS ---

const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-mail" },
    { event: "app/task.assigned" },
    async ({ event, step }) => {
        const { taskId, origin } = event.data;
        
        // Fetch data inside a step
        const task = await step.run('fetch-task', async () => {
            return await prisma.task.findUnique({
                where: { id: taskId },
                include: { assignee: true, project: true }
            });
        });

        if (!task || !task.assignee) return;

        await step.run('send-assignment-email', async () => {
            await sendEmail({
                to: task.assignee.email,
                subject: `New Task: ${task.title}`,
                body: `You have been assigned to ${task.title} in ${task.project.name}. <a href="${origin}">View Task</a>`
            });
        });
    }
)

// --- EXPORT ALL FUNCTIONS ---
// This was likely the missing part!
export const functions = [
    syncUserCreation, 
    syncUserUpdation, 
    syncUserDeletion, 
    syncWorkspaceCreation, 
    syncWorkspaceUpdation, 
    syncWorkspaceDeletion, 
    syncWorkspaceMemberCreation, 
    sendTaskAssignmentEmail
];