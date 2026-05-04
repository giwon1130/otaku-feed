# OtakuFeed Privacy Policy

**Last updated**: April 30, 2026
**Service**: OtakuFeed
**Contact**: giwon1130@gmail.com

---

OtakuFeed ("the Service") respects user privacy. This policy describes what data we collect and how we use it.

## 1. Data We Collect

### 1-1. On signup
- Email address
- Password (stored as BCrypt hash, never plaintext)
- Nickname

### 1-2. On social login (optional)
- Kakao login: Kakao user ID, nickname (whatever Kakao provides)
- Google login: Google user ID, email

### 1-3. During app use
- Like / pass records (anime ID + result)
- Favorite genres (user-selected)
- Search history (stored on device only, never sent to server)

### 1-4. Auto-collected
- Device ID (app-generated, anonymous)

❌ **Not collected**: Location, contacts, photos, microphone, camera, advertising ID, browsing history, user content (messages, files, etc.)

## 2. How We Use Data

| Data | Purpose |
|------|---------|
| Email / password / OAuth ID | User authentication |
| Nickname | Display in app header |
| Like/pass records | Recommendation algorithm |
| Favorite genres | Recommendation filtering |

## 3. Storage and Deletion

- **Storage**: Railway-hosted PostgreSQL (US region)
- **Retention**: As long as your account exists. On deletion request, removed immediately.
- **Method**: DB row deletion (CASCADE removes related likes/prefs)
- **Backups**: Railway's automated backups (per their policy)

## 4. Third-party Services

We send data to the following external services. **No personal identifiers are sent**:

| Service | Data sent | Purpose |
|---------|-----------|---------|
| AniList (graphql.anilist.co) | Anime IDs, search queries | Catalog lookup |
| Laftel (api.laftel.net) | Korean keywords | Korean OTT availability |
| DeepL (api-free.deepl.com) | Translation text (anime titles/descriptions) | English→Korean translation |
| Google Translate | Same as above (DeepL fallback) | Same as above |
| Kakao | OAuth token | Kakao login |
| Google | OAuth token | Google login |

## 5. Your Rights

You may:

- **View your data**: In-app via "My List" tab
- **Modify**: In-app likes/prefs
- **Delete**: Currently no in-app delete. Email giwon1130@gmail.com — processed within 7 days.
- **Withdraw consent**: Log out + request account deletion

## 6. Security

- **HTTPS**: All server communication encrypted
- **JWT tokens**: Stored in iOS Keychain (`expo-secure-store`)
- **Passwords**: BCrypt hash (irreversible)
- **Local storage**: Likes/prefs stored in standard device storage (AsyncStorage). Not considered sensitive.

## 7. Children's Privacy

Service is intended for users aged 14 and above. We do not knowingly accept signups from anyone under 14.

## 8. Privacy Officer

- Name: Giwon Im
- Email: giwon1130@gmail.com
- Response time: within 7 days

## 9. Changes

Material changes to this policy will be announced in-app and via the GitHub repository at least 30 days in advance.

Previous versions: [GitHub commit history](https://github.com/giwon1130/otaku-feed/commits/main/docs/legal/privacy-en.md)

---

**한국어 버전**: [privacy-ko.md](privacy-ko.md)
