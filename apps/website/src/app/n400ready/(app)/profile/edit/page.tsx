'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Link2 } from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { useAuth, type Profile } from '@/components/providers/AuthProvider';
import { getAvatarUrl, getInitials } from '@/lib/profile-utils';
import { getLinkedProviders, updateProfile, uploadAvatar } from '@/lib/profile';
import type { User as AuthUser } from '@supabase/supabase-js';

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
};

export default function ProfileEditPage() {
  const { user, profile } = useAuth();

  if (!profile || !user) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  // Form state lives in a child that mounts only once the profile exists,
  // so useState initializers can seed from it directly (no sync effect).
  return <ProfileEditForm profile={profile} user={user} />;
}

function ProfileEditForm({ profile, user }: { profile: Profile; user: AuthUser }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [middleName, setMiddleName] = useState(profile.middle_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [preferredName, setPreferredName] = useState(profile.preferred_name ?? '');
  const [nameSuffix, setNameSuffix] = useState(profile.name_suffix ?? '');
  const [language, setLanguage] = useState<'en' | 'vi'>(profile.preferred_language ?? 'en');
  const [providers, setProviders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getLinkedProviders().then(setProviders);
  }, []);

  const avatarUrl = getAvatarUrl(profile.avatar_path, profile.updated_at);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const { error: err } = await updateProfile(user.id, {
        first_name: firstName.trim() || null,
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        preferred_name: preferredName.trim() || null,
        name_suffix: nameSuffix.trim() || null,
        preferred_language: language,
      });

      if (err) {
        setError(err);
        return;
      }

      await refreshProfile();
      setSaved(true);
      router.push(`/n400ready/profile`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { error: err } = await uploadAvatar(user.id, file);
      if (err) {
        setError(err);
      } else {
        await refreshProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[720px] mx-auto">
      <Link
        href={`/n400ready/profile`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700"
      >
        <ArrowLeft size={16} /> Quay lại hồ sơ
      </Link>

      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Chỉnh sửa hồ sơ</h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-teal-100 relative shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-teal-600">{getInitials(profile)}</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100 disabled:opacity-50"
            >
              <Camera size={14} /> {uploading ? 'Đang tải lên…' : 'Đổi ảnh đại diện'}
            </button>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG, WebP hoặc GIF.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Structured name form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Tên / First Name"
              value={firstName}
              onChange={setFirstName}
              placeholder="Christopher"
            />
            <Field
              label="Họ / Last Name"
              value={lastName}
              onChange={setLastName}
              placeholder="Nguyen"
            />
            <Field
              label="Tên đệm / Middle Name"
              value={middleName}
              onChange={setMiddleName}
              placeholder="Van"
              hint="Chỉ dùng cho giấy tờ pháp lý — không hiển thị trong ứng dụng."
            />
            <Field
              label="Hậu tố / Suffix"
              value={nameSuffix}
              onChange={setNameSuffix}
              placeholder="Jr., III…"
              hint="Không bắt buộc."
            />
          </div>
          <Field
            label="Tên thường gọi / Preferred Name"
            value={preferredName}
            onChange={setPreferredName}
            placeholder="Chris"
            hint="Tên hiển thị trong ứng dụng. Không bắt buộc."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngôn ngữ / Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'vi')}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saved ? <Check size={14} /> : null}
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
            <Link
              href={`/n400ready/profile`}
              className="px-5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
            >
              Hủy
            </Link>
          </div>
        </form>
      </Card>

      {/* Connected accounts */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-1">Tài khoản đã liên kết</h3>
        <p className="text-xs text-gray-500 mb-4">
          Email và đăng nhập được quản lý bởi hệ thống xác thực — chỉ đọc.
        </p>
        <div className="flex flex-wrap gap-2">
          {providers.length === 0 ? (
            <span className="text-sm text-gray-400">Đang tải…</span>
          ) : (
            providers.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold"
              >
                <Link2 size={12} /> {PROVIDER_LABELS[p] ?? p}
              </span>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
      />
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}
