// Адаптер для преобразования данных discussions из API в формат frontend
import { ApiDiscussion, ApiDiscussionReply, usersApi } from './apiClient';
import { Discussion, DiscussionReply } from '@/data/discussions';

// Кэш для пользователей, чтобы не делать лишние запросы
const userCache = new Map<string, { name: string; avatar: string }>();

async function getUserInfo(userId: string): Promise<{ name: string; avatar: string }> {
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  try {
    const user = await usersApi.getById(userId);
    const name = user.full_name || user.username || 'Неизвестный пользователь';
    const avatar = user.avatar_url || name.substring(0, 2).toUpperCase();
    const info = { name, avatar };
    userCache.set(userId, info);
    return info;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    // Return cached fallback or default
    const fallback = { name: 'Неизвестный пользователь', avatar: '??' };
    userCache.set(userId, fallback);
    return fallback;
  }
}

export async function adaptApiDiscussionToDiscussion(apiDiscussion: ApiDiscussion): Promise<Discussion> {
  const authorInfo = await getUserInfo(apiDiscussion.author_id);
  
  const replies: DiscussionReply[] = await Promise.all(
    apiDiscussion.replies.map(adaptApiReplyToReply)
  );

  return {
    id: apiDiscussion.id,
    courseId: apiDiscussion.course_id,
    authorId: apiDiscussion.author_id,
    authorName: authorInfo.name,
    authorAvatar: authorInfo.avatar,
    title: apiDiscussion.title,
    content: apiDiscussion.content,
    createdAt: apiDiscussion.created_at,
    updatedAt: apiDiscussion.updated_at,
    likes: apiDiscussion.likes_count,
    likedBy: [], // Backend не возвращает список лайкнувших, только количество
    replies,
    isPinned: apiDiscussion.is_pinned,
  };
}

export async function adaptApiReplyToReply(apiReply: ApiDiscussionReply): Promise<DiscussionReply> {
  const authorInfo = await getUserInfo(apiReply.author_id);

  return {
    id: apiReply.id,
    discussionId: apiReply.discussion_id,
    authorId: apiReply.author_id,
    authorName: authorInfo.name,
    authorAvatar: authorInfo.avatar,
    content: apiReply.content,
    createdAt: apiReply.created_at,
    updatedAt: apiReply.updated_at,
    likes: apiReply.likes_count,
    likedBy: [], // Backend не возвращает список лайкнувших, только количество
  };
}

export async function adaptApiDiscussionsToDiscussions(apiDiscussions: ApiDiscussion[]): Promise<Discussion[]> {
  return Promise.all(apiDiscussions.map(adaptApiDiscussionToDiscussion));
}

