import prisma from "../configs/prisma.js";

// Get all workspace for user
export const getUserWorkspaces = async (req, res) => {
    try {
        // FIXED: req.auth() is a function call. Do not use 'await'.
        const { userId } = req.auth();

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const workspaces = await prisma.workspace.findMany({
            where: {
                members: { some: { userId: userId } }
            },
            include: {
                members: { include: { user: true } },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignee: true,
                                comments: { include: { user: true } }
                            }
                        },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        });
        res.json({ workspaces })

    } catch (error) {
        console.error("Workspace Fetch Error:", error); // Log exact error to terminal
        res.status(500).json({ message: error.code || error.message })
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { email, role, workspaceId, message } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (!workspaceId || !role) {
            return res.status(400).json({ message: "Missing required parameters" })
        }

        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { members: true } })
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" })
        }

        if (!workspace.members.find((member) => member.userId === userId && member.role === "ADMIN")) {
            return res.status(403).json({ message: "You do not have admin privileges" })
        }

        const existingMember = workspace.members.find((member) => member.userId === user.id);
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member" })
        }
        
        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            }
        })
        res.json({ member, message: "Member added successfully" })

    } catch (error) {
        console.error("Add Member Error:", error);
        res.status(500).json({ message: error.code || error.message })
    }
}