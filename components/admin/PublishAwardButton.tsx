'use client';

import { useState } from 'react';
import { publishAward } from '@/lib/actions/awards';

export default function PublishAwardButton({
  awardId,
  awardType,
  winnerName,
}: {
  awardId: string;
  awardType: string;
  winnerName: string;
}) {
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await publishAward(awardId, awardType);
    } finally {
      // We don't setSaving(false) on success because the page will re-render
      // with the new status, but if it errors we should let them try again.
      // Next.js actions usually revalidate the path anyway.
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={saving}
      className="btn-primary"
    >
      {saving ? 'PUBLISHING...' : 'PUBLISH AWARD'}
    </button>
  );
}
