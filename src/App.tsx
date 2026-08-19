import React, { useState, useEffect } from 'react';
import { NavTab, Item, Category, Zone, AppSettings, ChatMessage } from './types';
import { INITIAL_ITEMS, INITIAL_ZONES } from './data/initialItems';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ListView } from './components/ListView';
import { ItemDetailView } from './components/ItemDetailView';
import { PostItemView } from './components/PostItemView';
import { MapView } from './components/MapView';
import { SettingsView } from './components/SettingsView';
import { ChatModal } from './components/ChatModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('list');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [chatItem, setChatItem] = useState<Item | null>(null);

  // Persistent storage hooks or default state
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('shoumanwu_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ITEMS;
  });

  const [zones, setZones] = useState<Zone[]>(() => {
    const saved = localStorage.getItem('shoumanwu_zones');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ZONES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('shoumanwu_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      language: 'zh',
      pushNotifications: true,
      soundAlerts: false,
      appearance: 'System default',
    };
  });

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('shoumanwu_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      'item-1': [
        {
          id: 'msg-1',
          itemId: 'item-1',
          sender: 'owner',
          text: 'Hi there! Feel free to ask any questions about picking up the Vintage Lounge Chair.',
          timestamp: '10:15 AM',
        },
      ],
    };
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('shoumanwu_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('shoumanwu_zones', JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem('shoumanwu_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('shoumanwu_messages', JSON.stringify(messages));
  }, [messages]);

  // Handlers
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setCurrentTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClaimItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: false, claimedBy: 'me' } : i))
    );
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => (prev ? { ...prev, isAvailable: false, claimedBy: 'me' } : null));
    }
  };

  const handlePostSuccess = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
    setSelectedItem(newItem);
    setCurrentTab('detail');
  };

  const handleToggleZoneStatus = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) =>
        z.id === zoneId
          ? {
              ...z,
              status: z.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
              lastUpdated: 'Updated just now',
            }
          : z
      )
    );
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
  };

  const handleAddZone = (name: string, description: string) => {
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name,
      description,
      status: 'ACTIVE',
      lastUpdated: 'Created just now',
      icon: 'location_on',
    };
    setZones((prev) => [...prev, newZone]);
  };

  const handleResetAllData = () => {
    localStorage.removeItem('shoumanwu_items');
    localStorage.removeItem('shoumanwu_zones');
    localStorage.removeItem('shoumanwu_settings');
    localStorage.removeItem('shoumanwu_messages');
    setItems(INITIAL_ITEMS);
    setZones(INITIAL_ZONES);
    setSettings({
      language: 'zh',
      pushNotifications: true,
      soundAlerts: false,
      appearance: 'System default',
    });
    setMessages({});
    setSelectedItem(null);
    setCurrentTab('list');
  };

  const handleSendMessage = (itemId: string, text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      itemId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), userMsg],
    }));

    // Auto simulated response from owner
    setTimeout(() => {
      const targetItem = items.find((i) => i.id === itemId);
      const ownerName = targetItem?.owner.name || 'Owner';
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        itemId,
        sender: 'owner',
        text: `Thanks for messaging! Yes, ${targetItem?.title || 'this item'} is ready. Let me know what time suits you best for pickup!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), replyMsg],
      }));
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f8] text-[#1a1c1c] antialiased selection:bg-black selection:text-white">
      {/* Top Header Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'detail') setSelectedItem(null);
        }}
        onBack={() => {
          setCurrentTab('list');
          setSelectedItem(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearchInput={showSearchInput}
        onToggleSearchInput={() => setShowSearchInput(!showSearchInput)}
      />

      {/* Main View Switcher */}
      <div className="flex-1">
        {currentTab === 'list' && (
          <ListView
            items={items}
            onSelectItem={handleSelectItem}
            onClaimItem={handleClaimItem}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        )}

        {currentTab === 'map' && (
          <MapView
            items={items}
            onSelectItem={handleSelectItem}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {currentTab === 'post' && <PostItemView onPostSuccess={handlePostSuccess} />}

        {currentTab === 'setting' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            zones={zones}
            onToggleZoneStatus={handleToggleZoneStatus}
            onDeleteZone={handleDeleteZone}
            onAddZone={handleAddZone}
            onResetAllData={handleResetAllData}
          />
        )}

        {currentTab === 'detail' && selectedItem && (
          <ItemDetailView
            item={selectedItem}
            allItems={items}
            onSelectItem={handleSelectItem}
            onClaimItem={handleClaimItem}
            onOpenMessageOwner={(ownerName, itemId) => {
              const itemToChat = items.find((i) => i.id === itemId) || selectedItem;
              setChatItem(itemToChat);
            }}
          />
        )}
      </div>

      {/* Floating Chat Modal */}
      {chatItem && (
        <ChatModal
          item={chatItem}
          messages={messages[chatItem.id] || []}
          onSendMessage={handleSendMessage}
          onClose={() => setChatItem(null)}
        />
      )}

      {/* Fixed Bottom Navigation Shell */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'detail') setSelectedItem(null);
        }}
        settings={settings}
      />
    </div>
  );
}
