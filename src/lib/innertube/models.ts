/**
 * Innertube Models and Endpoint Definitions
 * Converted directly from Kotlin: com.metrolist.innertube.models
 */

export interface UrlEndpoint {
  url?: string;
  target?: string;
}

export interface Icon {
  iconType: string;
}

export interface ResponseContext {
  visitorData?: string;
  serviceTrackingParams?: Array<{
    service: string;
    params: Array<{ key: string; value: string }>;
  }>;
}

export interface Thumbnails {
  thumbnails: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export interface ThumbnailRenderer {
  musicThumbnailRenderer?: {
    thumbnail: Thumbnails;
    thumbnailCrop?: string;
    thumbnailScale?: string;
  };
  musicAnimatedThumbnailRenderer?: {
    animatedThumbnail: Thumbnails;
    backupRenderer: any;
  };
  croppedSquareThumbnailRenderer?: {
    thumbnail: Thumbnails;
    thumbnailCrop?: string;
    thumbnailScale?: string;
  };
}

export interface WatchEndpoint {
  videoId?: string;
  playlistId?: string;
  playlistSetVideoId?: string;
  params?: string;
  index?: number;
  watchEndpointMusicSupportedConfigs?: {
    watchEndpointMusicConfig: {
      musicVideoType: string;
    };
  };
}

export interface BrowseEndpoint {
  browseId: string;
  params?: string;
  browseEndpointContextSupportedConfigs?: {
    browseEndpointContextMusicConfig: {
      pageType: string;
    };
  };
}

export class BrowseEndpointHelper {
  static isArtist(endpoint: BrowseEndpoint): boolean {
    return (
      endpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_ARTIST'
    );
  }

  static isAlbum(endpoint: BrowseEndpoint): boolean {
    const pageType =
      endpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    return pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK';
  }

  static isPlaylist(endpoint: BrowseEndpoint): boolean {
    return (
      endpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_PLAYLIST'
    );
  }

  static isPodcast(endpoint: BrowseEndpoint): boolean {
    return (
      endpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig
        ?.pageType === 'MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE'
    );
  }
}

export interface SearchEndpoint {
  params?: string;
  query: string;
}

export interface FeedbackEndpoint {
  feedbackToken: string;
}

export interface QueueAddEndpoint {
  queueInsertPosition: string;
  queueTarget: {
    videoId?: string;
    playlistId?: string;
  };
}

export interface ShareEntityEndpoint {
  serializedShareEntity: string;
}

export interface DefaultServiceEndpoint {
  subscribeEndpoint?: {
    channelIds: string[];
    params?: string;
  };
  feedbackEndpoint?: FeedbackEndpoint;
}

export interface ToggledServiceEndpoint {
  feedbackEndpoint?: FeedbackEndpoint;
}

export interface PlayabilityStatus {
  status: string;
  reason?: string;
}

export interface PlayerAudioConfig {
  loudnessDb?: number;
  perceptualLoudnessDb?: number;
}

export interface PlayerConfig {
  audioConfig: PlayerAudioConfig;
}

export interface AudioTrack {
  displayName?: string;
  id?: string;
  isAutoDubbed?: boolean;
}

export interface Format {
  itag: number;
  url?: string;
  mimeType: string;
  bitrate: number;
  width?: number;
  height?: number;
  contentLength?: number;
  quality: string;
  fps?: number;
  qualityLabel?: string;
  averageBitrate?: number;
  audioQuality?: string;
  approxDurationMs?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  loudnessDb?: number;
  lastModified?: number;
  signatureCipher?: string;
  cipher?: string;
  audioTrack?: AudioTrack;
}

export type InnertubeStreamFormat = Format;

export interface StreamingData {
  formats?: Format[];
  adaptiveFormats: Format[];
  expiresInSeconds: number;
}

export interface VideoDetails {
  videoId: string;
  title?: string;
  author?: string;
  channelId: string;
  lengthSeconds: string;
  musicVideoType?: string;
  viewCount?: string;
  thumbnail: Thumbnails;
}

export interface PlaybackTracking {
  videostatsPlaybackUrl?: { baseUrl?: string };
  videostatsWatchtimeUrl?: { baseUrl?: string };
  atrUrl?: { baseUrl?: string };
}

export interface PlayerResponse {
  responseContext: ResponseContext;
  playabilityStatus: PlayabilityStatus;
  playerConfig?: PlayerConfig;
  streamingData?: StreamingData;
  videoDetails?: VideoDetails;
  playbackTracking?: PlaybackTracking;
}

export interface SearchResponse {
  contents?: {
    tabbedSearchResultsRenderer?: any;
  };
  continuationContents?: {
    musicShelfContinuation: {
      contents: Array<{ musicResponsiveListItemRenderer: any }>;
      continuations?: any[];
    };
  };
}

export interface MusicTwoRowItemRenderer {
  title: { runs: Array<{ text: string }> };
  subtitle?: { runs: Array<{ text: string }> };
  subtitleBadges?: any[];
  menu?: any;
  thumbnailRenderer: ThumbnailRenderer;
  navigationEndpoint: {
    endpoint?: WatchEndpoint;
    browseEndpoint?: BrowseEndpoint;
    musicVideoType?: string;
  };
}
