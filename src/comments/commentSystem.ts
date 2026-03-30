/**
 * Comment System
 * Threaded comments with @mentions and status tracking
 */

export type CommentStatus = "open" | "resolved" | "closed";
export type CommentPriority = "low" | "medium" | "high" | "critical";

export interface Comment {
  id: string;
  cellKey: string; // "rowKey|colKey|measureIndex"
  parentId: string | null; // null for top-level comments
  author: UserInfo;
  content: string;
  mentions: string[]; // user IDs mentioned
  createdAt: number;
  updatedAt: number;
  status: CommentStatus;
  priority: CommentPriority;
  reactions: Reaction[];
  replies: Comment[]; // nested replies
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface CommentThread {
  cellKey: string;
  rootComment: Comment;
  replyCount: number;
  lastActivity: number;
  participants: string[]; // user IDs
  isResolved: boolean;
}

export interface CommentNotification {
  id: string;
  type: "mention" | "reply" | "reaction" | "statusChange";
  recipientId: string;
  senderId: string;
  senderName: string;
  commentId: string;
  cellKey: string;
  message: string;
  read: boolean;
  timestamp: number;
}

// Comment storage
class CommentStore {
  private comments: Map<string, Comment> = new Map();
  private cellComments: Map<string, string[]> = new Map(); // cellKey -> commentIds
  private userComments: Map<string, string[]> = new Map(); // userId -> commentIds
  private notifications: CommentNotification[] = [];

  // Create a new comment
  createComment(
    cellKey: string,
    author: UserInfo,
    content: string,
    parentId: string | null = null,
    priority: CommentPriority = "medium"
  ): Comment {
    const id = `comment_${Date.now()}_${Date.now().toString(36).substr(2, 9)}`;
    const mentions = this.extractMentions(content);

    const comment: Comment = {
      id,
      cellKey,
      parentId,
      author,
      content,
      mentions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "open",
      priority,
      reactions: [],
      replies: [],
    };

    this.comments.set(id, comment);

    // Index by cell
    if (!this.cellComments.has(cellKey)) {
      this.cellComments.set(cellKey, []);
    }
    this.cellComments.get(cellKey)!.push(id);

    // Index by user
    if (!this.userComments.has(author.id)) {
      this.userComments.set(author.id, []);
    }
    this.userComments.get(author.id)!.push(id);

    // Create notifications for mentions
    for (const mention of mentions) {
      this.createNotification({
        type: "mention",
        recipientId: mention,
        senderId: author.id,
        senderName: author.name,
        commentId: id,
        cellKey,
        message: `${author.name} mentioned you in a comment`,
      });
    }

    // Notify parent comment author of reply
    if (parentId) {
      const parent = this.comments.get(parentId);
      if (parent && parent.author.id !== author.id) {
        this.createNotification({
          type: "reply",
          recipientId: parent.author.id,
          senderId: author.id,
          senderName: author.name,
          commentId: id,
          cellKey,
          message: `${author.name} replied to your comment`,
        });
      }
    }

    return comment;
  }

  // Update comment
  updateComment(commentId: string, content: string): Comment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const oldMentions = comment.mentions;
    const newMentions = this.extractMentions(content);

    comment.content = content;
    comment.mentions = newMentions;
    comment.updatedAt = Date.now();

    // Notify new mentions
    const addedMentions = newMentions.filter((m) => !oldMentions.includes(m));
    for (const mention of addedMentions) {
      this.createNotification({
        type: "mention",
        recipientId: mention,
        senderId: comment.author.id,
        senderName: comment.author.name,
        commentId,
        cellKey: comment.cellKey,
        message: `${comment.author.name} mentioned you in a comment`,
      });
    }

    return comment;
  }

  // Delete comment
  deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    // Remove from cell index
    const cellIds = this.cellComments.get(comment.cellKey);
    if (cellIds) {
      const idx = cellIds.indexOf(commentId);
      if (idx > -1) cellIds.splice(idx, 1);
    }

    // Remove from user index
    const userIds = this.userComments.get(comment.author.id);
    if (userIds) {
      const idx = userIds.indexOf(commentId);
      if (idx > -1) userIds.splice(idx, 1);
    }

    // Recursively delete replies
    for (const reply of comment.replies) {
      this.deleteComment(reply.id);
    }

    this.comments.delete(commentId);
    return true;
  }

  // Add reply to comment
  addReply(parentId: string, author: UserInfo, content: string, priority?: CommentPriority): Comment | null {
    const parent = this.comments.get(parentId);
    if (!parent) return null;

    const reply = this.createComment(parent.cellKey, author, content, parentId, priority);
    parent.replies.push(reply);
    parent.updatedAt = Date.now();

    return reply;
  }

  // Add reaction
  addReaction(commentId: string, emoji: string, user: UserInfo): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    // Remove existing reaction from same user
    comment.reactions = comment.reactions.filter((r) => r.userId !== user.id);

    // Add new reaction
    comment.reactions.push({
      emoji,
      userId: user.id,
      userName: user.name,
      timestamp: Date.now(),
    });

    // Notify comment author
    if (comment.author.id !== user.id) {
      this.createNotification({
        type: "reaction",
        recipientId: comment.author.id,
        senderId: user.id,
        senderName: user.name,
        commentId,
        cellKey: comment.cellKey,
        message: `${user.name} reacted ${emoji} to your comment`,
      });
    }

    return true;
  }

  // Remove reaction
  removeReaction(commentId: string, userId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.reactions = comment.reactions.filter((r) => r.userId !== userId);
    return true;
  }

  // Update status
  updateStatus(commentId: string, status: CommentStatus, user: UserInfo): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    const oldStatus = comment.status;
    comment.status = status;
    comment.updatedAt = Date.now();

    // Update all replies in thread
    this.updateThreadStatus(comment, status);

    // Notify participants of status change
    if (oldStatus !== status) {
      const thread = this.getThread(commentId);
      for (const participantId of thread.participants) {
        if (participantId !== user.id) {
          this.createNotification({
            type: "statusChange",
            recipientId: participantId,
            senderId: user.id,
            senderName: user.name,
            commentId,
            cellKey: comment.cellKey,
            message: `${user.name} ${status === "resolved" ? "resolved" : "updated status of"} the thread`,
          });
        }
      }
    }

    return true;
  }

  // Get single comment
  getComment(commentId: string): Comment | null {
    return this.comments.get(commentId) || null;
  }

  // Get all comments for a cell
  getCellComments(cellKey: string): Comment[] {
    const ids = this.cellComments.get(cellKey) || [];
    return ids
      .map((id) => this.comments.get(id))
      .filter((c): c is Comment => c !== undefined && c.parentId === null);
  }

  // Get comment thread
  getThread(rootCommentId: string): CommentThread {
    const root = this.comments.get(rootCommentId);
    if (!root) {
      throw new Error("Comment not found");
    }

    const participants = new Set<string>();
    participants.add(root.author.id);

    const countReplies = (comment: Comment): number => {
      let count = comment.replies.length;
      for (const reply of comment.replies) {
        participants.add(reply.author.id);
        count += countReplies(reply);
      }
      return count;
    };

    const replyCount = countReplies(root);

    return {
      cellKey: root.cellKey,
      rootComment: root,
      replyCount,
      lastActivity: root.updatedAt,
      participants: Array.from(participants),
      isResolved: root.status === "resolved",
    };
  }

  // Get all threads for a cell
  getCellThreads(cellKey: string): CommentThread[] {
    const rootComments = this.getCellComments(cellKey);
    return rootComments.map((c) => this.getThread(c.id));
  }

  // Get user notifications
  getNotifications(userId: string, unreadOnly: boolean = false): CommentNotification[] {
    let notifs = this.notifications.filter((n) => n.recipientId === userId);
    if (unreadOnly) {
      notifs = notifs.filter((n) => !n.read);
    }
    return notifs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Mark notification as read
  markNotificationRead(notificationId: string): boolean {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  // Mark all notifications as read
  markAllRead(userId: string): number {
    const userNotifs = this.notifications.filter((n) => n.recipientId === userId && !n.read);
    for (const n of userNotifs) {
      n.read = true;
    }
    return userNotifs.length;
  }

  // Search comments
  searchComments(query: string): Comment[] {
    const results: Comment[] = [];
    const lowerQuery = query.toLowerCase();

    for (const comment of this.comments.values()) {
      if (
        comment.content.toLowerCase().includes(lowerQuery) ||
        comment.author.name.toLowerCase().includes(lowerQuery)
      ) {
        results.push(comment);
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get comment statistics
  getStats(): {
    totalComments: number;
    openComments: number;
    resolvedComments: number;
    byPriority: Record<CommentPriority, number>;
    byCell: Map<string, number>;
  } {
    const stats = {
      totalComments: 0,
      openComments: 0,
      resolvedComments: 0,
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 } as Record<CommentPriority, number>,
      byCell: new Map<string, number>(),
    };

    for (const comment of this.comments.values()) {
      if (comment.parentId === null) {
        // Count only root comments
        stats.totalComments++;
        if (comment.status === "open") stats.openComments++;
        if (comment.status === "resolved") stats.resolvedComments++;
        stats.byPriority[comment.priority]++;

        const count = stats.byCell.get(comment.cellKey) || 0;
        stats.byCell.set(comment.cellKey, count + 1);
      }
    }

    return stats;
  }

  // Export all comments
  exportToJSON(): string {
    const data = Array.from(this.comments.values());
    return JSON.stringify(data, null, 2);
  }

  // Import comments
  importFromJSON(json: string): boolean {
    try {
      const data: Comment[] = JSON.parse(json);
      for (const comment of data) {
        this.comments.set(comment.id, comment);
      }
      return true;
    } catch {
      return false;
    }
  }

  // Helper methods
  private extractMentions(content: string): string[] {
    const mentionRegex = /@\w+/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map((m) => m.substring(1)); // Remove @ prefix
  }

  private createNotification(partial: Omit<CommentNotification, "id" | "read" | "timestamp">): void {
    this.notifications.push({
      ...partial,
      id: `notif_${Date.now()}_${Date.now().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: Date.now(),
    });
  }

  private updateThreadStatus(comment: Comment, status: CommentStatus): void {
    for (const reply of comment.replies) {
      reply.status = status;
      this.updateThreadStatus(reply, status);
    }
  }
}

// Singleton instance
let commentStoreInstance: CommentStore | null = null;

export function getCommentStore(): CommentStore {
  if (!commentStoreInstance) {
    commentStoreInstance = new CommentStore();
  }
  return commentStoreInstance;
}

export function resetCommentStore(): void {
  commentStoreInstance = null;
}

// Re-export types
export { CommentStore };
