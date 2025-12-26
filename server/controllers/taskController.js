import prisma from "../configs/prisma.js";
import { inngest } from "../Inngest/index.js";

// create task
export const createTask = async (req, res) => {
    try {
        // FIXED: req.auth() is a function call
        const { userId } = req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;
        const origin = req.get('origin')

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found " });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(403).json({ message: "Assignee is not a member of the project/workspace" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,
                assigneeId,
                status,
                type,
                due_date: new Date(due_date)
            }
        })

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true }
        })

        if (inngest) {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id, origin
                }
            })
        }

        res.json({ task: taskWithAssignee, message: "Task created successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// Update task
export const updateTask = async (req, res) => {
    try {
        // FIXED: req.auth() is a function call
        const { userId } = req.auth();
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        })

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found " });
        } 
        
        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: req.body
        })

        res.json({ task: updatedTask, message: "Task updated successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// Delete task
export const deleteTask = async (req, res) => {
    try {
        //Qs FIXED: req.auth() is a function call
        const { userId } = req.auth();
        const { tasksIds } = req.body
        
        if(!tasksIds || tasksIds.length === 0) {
             return res.status(400).json({message: "No tasks selected"});
        }

        const firstTask = await prisma.task.findUnique({
            where: { id: tasksIds[0] }
        })

        if(!firstTask) {
             return res.status(404).json({message: "Task not found"});
        }

        const project = await prisma.project.findUnique({
            where: { id: firstTask.projectId },
            include: { members: { include: { user: true } } }
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found " });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: tasksIds } }
        })

        res.json({ message: "Task deleted successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}