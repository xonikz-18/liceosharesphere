import { Injectable } from '@angular/core';

export interface LentItem {
  id: number;
  name: string;
  description: string;
  status: 'available' | 'borrowed' | 'returned';
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  private items: LentItem[] = [
    {
      id: 1,
      name: 'P.E Uniform',
      description: 'Good condition',
      status: 'available',
      image: 'peuniform.png'
    },
    {
      id: 2,
      name: 'P.E Uniform',
      description: 'Used',
      status: 'returned',
      image: 'peuniform.png'
    }
  ];

  getItems(){
    return this.items;
  }

  getItemById(id: number){
    return this.items.find(i => i.id === id);
  }

  updateItem(updated: LentItem){
    const index = this.items.findIndex(i => i.id === updated.id);
    if(index !== -1){
      this.items[index] = updated;
    }
  }
}