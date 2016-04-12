clearvars;
hands = importdata('hands.csv');
clusters = importdata('hands_pca_clustering.csv');
cluster = clusters.data;


cluster1 = hands(find(cluster(:,3)==1),:);
cluster2 = hands(find(cluster(:,3)==2),:);
cluster3 = hands(find(cluster(:,3)==3),:);


handMean = mean(hands);
cluster1mean = mean(cluster1);
cluster2mean = mean(cluster2);
cluster3mean = mean(cluster3);

hands = [hands ; handMean ; cluster1mean ; cluster2mean ; cluster3mean];

nrRows = 44*56;
hands2 = zeros(nrRows,3);

for i = 0:(nrRows-1)
    hand = floor(i/56)+1;
    xcoord = hands(hand,mod(i,56)+1);
    ycoord = hands(hand,mod(i,56)+56+1);
    
    hands2(i+1,:) = [hand, xcoord, ycoord];
end

csvwrite('hands2.csv',hands2);

%%

nrRows = 17*130;
sibiu2 = zeros(nrRows,3);


for i = 0:(nrRows-1)
    row = floor(i/17)+1;
    year = sibiu(row,1);
    month = mod(i,17)+1;
    
    temperature = sibiu(row,month+1);
    
    sibiu2(i+1,:) = [year, month, temperature];
end 

csvwrite('stationSibiu1.csv',sibiu2);

%% clustering
clearvars;
hands1 = importdata('hands_pca_2.csv');
hands2 = importdata('hands_pca.csv');

h1 = hands1.data;


idx = kmeans(hands2,3);

output = [h1, idx];



csvwrite('hands_pca_clustering.csv',output);





