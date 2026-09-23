const publishConfirmMessage =
    'This playlist will be visible to all signed-in LF Chords users. '
    'Private playlists are only visible to you and people you invite.';

String playlistVisibilityLabel(String status) =>
    status == 'published' ? 'Public' : 'Private';

String playlistVisibilitySuffix(String status) =>
    status == 'draft' ? ' · Private' : '';
