/** აპის pushNavigation / UserContext-თან შესაბამისი payload-ები */

export type CommunityPushKind =
  | 'club_join'
  | 'community_comment'
  | 'community_post'
  | 'community_like'
  | 'club_post'
  | 'club_invite'
  | 'new_follower'
  | 'garage_activity';

export const COMMUNITY_PUSH_META: Record<
  CommunityPushKind,
  { screen: string; label: string; hint: string }
> = {
  club_join: {
    screen: 'groups',
    label: 'კლუბში გაწევრიანება',
    hint: 'მესაკუთრეს — ავტომატურად იგზავნება აპში join-ისას',
  },
  community_comment: {
    screen: 'Comments',
    label: 'კომენტარი პოსტზე',
    hint: 'postId სავალდებულო',
  },
  community_post: {
    screen: 'Community',
    label: 'კომუნიტის პოსტი',
    hint: 'postId ოფციონალური (highlight)',
  },
  community_like: {
    screen: 'Comments',
    label: 'ლაიქი',
    hint: 'იგივე რაც კომენტარი',
  },
  club_post: {
    screen: 'groups',
    label: 'კლუბის პოსტი',
    hint: 'groupId სავალდებულო',
  },
  club_invite: {
    screen: 'groups',
    label: 'კლუბის მოწვევა',
    hint: 'groupId სავალდებულო',
  },
  new_follower: {
    screen: 'Profile',
    label: 'ახალი გამომწერი',
    hint: 'userId / followerId — პროფილზე',
  },
  garage_activity: {
    screen: 'GarageActivity',
    label: 'მძღოლების აქტივობა',
    hint: '/garage-activity',
  },
};

export type CommunityPushFields = {
  postId?: string;
  commentId?: string;
  postUserId?: string;
  groupId?: string;
  clubId?: string;
  userId?: string;
  followerId?: string;
  joinerName?: string;
  groupName?: string;
  postText?: string;
  userName?: string;
};

export function buildCommunityPushData(
  kind: CommunityPushKind,
  fields: CommunityPushFields,
): Record<string, string> {
  const meta = COMMUNITY_PUSH_META[kind];
  const data: Record<string, string> = {
    type: kind,
    screen: meta.screen,
    timestamp: new Date().toISOString(),
  };

  if (fields.postId?.trim()) data.postId = fields.postId.trim();
  if (fields.commentId?.trim()) {
    data.commentId = fields.commentId.trim();
    data.highlightCommentId = fields.commentId.trim();
  }
  if (fields.postUserId?.trim()) data.postUserId = fields.postUserId.trim();
  if (fields.postText?.trim()) data.postText = fields.postText.trim();
  if (fields.userName?.trim()) data.userName = fields.userName.trim();

  const gid = (fields.groupId || fields.clubId || '').trim();
  if (gid) {
    data.groupId = gid;
    data.clubId = gid;
  }
  if (fields.groupName?.trim()) data.groupName = fields.groupName.trim();
  if (fields.joinerName?.trim()) data.joinerName = fields.joinerName.trim();

  const uid = (fields.userId || fields.followerId || '').trim();
  if (uid) {
    data.userId = uid;
    if (kind === 'club_join' || kind === 'new_follower') data.followerId = uid;
  }

  return data;
}

const MAKE_ALIASES: Record<string, string[]> = {
  bmw: ['bmw'],
  mercedes: ['mercedes', 'mercedes-benz', 'benz'],
  audi: ['audi'],
  toyota: ['toyota'],
  honda: ['honda'],
  ford: ['ford'],
  volkswagen: ['volkswagen', 'vw'],
  hyundai: ['hyundai'],
  kia: ['kia'],
  nissan: ['nissan'],
  mazda: ['mazda'],
  lexus: ['lexus'],
  porsche: ['porsche'],
};

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function detectMakesFromClub(name: string, description?: string, carMakes?: string[]): string[] {
  const found = new Set<string>();
  const hay = norm(`${name} ${description || ''}`);
  for (const [key, aliases] of Object.entries(MAKE_ALIASES)) {
    if (aliases.some((a) => hay.includes(a))) found.add(key);
  }
  if (Array.isArray(carMakes)) {
    for (const m of carMakes) {
      const n = norm(String(m));
      if (n) found.add(n.split(/\s+/)[0] || n);
    }
  }
  return [...found];
}

export function parseCarMakesInput(raw: string): string[] {
  return raw
    .split(/[,;|\s]+/)
    .map((s) => norm(s))
    .filter(Boolean);
}
