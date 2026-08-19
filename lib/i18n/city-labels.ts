import type { Messages } from '@/messages/it';
import type { ConsumerCityLabels } from '@/lib/listings/feed-search';

/** Build consumer city label map from localized messages. */
export function consumerCityLabelsFromMessages(messages: Messages): ConsumerCityLabels {
  const { feed } = messages;
  return {
    venice: feed.cityVenice,
    padova: feed.cityPadova,
    milano: feed.cityMilano,
    firenze: feed.cityFirenze,
    roma: feed.cityRoma,
    napoli: feed.cityNapoli,
    perugia: feed.cityPerugia,
    torino: feed.cityTorino,
    prato: feed.cityPrato,
  };
}

/** Filter chip labels keyed by filter prefs city value (includes `all`). */
export function consumerCityFilterLabelsFromMessages(
  messages: Messages,
): Record<'all' | keyof ConsumerCityLabels, string> {
  const cityLabels = consumerCityLabelsFromMessages(messages);
  return {
    all: messages.feed.cityAll,
    ...cityLabels,
  };
}
